package com.sichrplace.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.CreateSavedSearchRequest;
import com.sichrplace.backend.dto.SavedSearchDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.SavedSearch;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.SavedSearchRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the Execute Saved Search feature in {@link SavedSearchServiceImpl}.
 *
 * <p>Tests cover:
 * <ul>
 *   <li>executeSavedSearch — valid filter_json produces matching apartments</li>
 *   <li>executeSavedSearch — ownership validation rejects unauthorized users</li>
 *   <li>executeSavedSearch — malformed filter_json throws IllegalArgumentException</li>
 *   <li>executeSavedSearch — updates lastMatchedAt and matchCount</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("SavedSearchService — Execute Saved Search")
class SavedSearchServiceTest {

    @Mock private SavedSearchRepository savedSearchRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Spy  private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks private SavedSearchServiceImpl savedSearchService;

    private User owner;
    private SavedSearch savedSearch;

    @BeforeEach
    void setUp() {
        owner = User.builder()
                .id(1L)
                .email("alice@example.com")
                .password("hashed")
                .firstName("Alice")
                .lastName("Tester")
                .role(User.UserRole.TENANT)
                .isActive(true)
                .build();

        savedSearch = SavedSearch.builder()
                .id(10L)
                .user(owner)
                .name("Berlin 2BR")
                .filterJson("{\"city\":\"Berlin\",\"minBedrooms\":2}")
                .isActive(true)
                .matchCount(0)
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("valid filter_json → returns matching apartments + updates stats")
    void executeSavedSearch_validFilter() {
        // Create a matching apartment
        Apartment apt = Apartment.builder()
                .id(200L)
                .owner(owner)
                .title("Cozy 2BR in Berlin")
                .city("Berlin")
                .numberOfBedrooms(2)
                .monthlyRent(BigDecimal.valueOf(1200))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .build();

        Page<Apartment> apartmentPage = new PageImpl<>(List.of(apt));
        when(savedSearchRepository.findById(10L)).thenReturn(Optional.of(savedSearch));
        when(apartmentRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(apartmentPage);
        when(savedSearchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Page<ApartmentDto> result = savedSearchService.executeSavedSearch(10L, 1L, PageRequest.of(0, 20));

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("Cozy 2BR in Berlin", result.getContent().get(0).getTitle());

        // Verify stats updated
        assertNotNull(savedSearch.getLastMatchedAt());
        assertEquals(1, savedSearch.getMatchCount());
        verify(savedSearchRepository).save(savedSearch);
    }

    @Test
    @DisplayName("unauthorized user → throws SecurityException")
    void executeSavedSearch_unauthorizedUser() {
        when(savedSearchRepository.findById(10L)).thenReturn(Optional.of(savedSearch));

        assertThrows(SecurityException.class,
                () -> savedSearchService.executeSavedSearch(10L, 999L, PageRequest.of(0, 20)));

        verify(apartmentRepository, never()).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
        @DisplayName("malformed filter_json → throws IllegalArgumentException")
    void executeSavedSearch_malformedJson() {
        savedSearch.setFilterJson("{invalid json!!!");
        when(savedSearchRepository.findById(10L)).thenReturn(Optional.of(savedSearch));

                IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> savedSearchService.executeSavedSearch(10L, 1L, PageRequest.of(0, 20)));
        assertTrue(ex.getMessage().contains("Invalid filter_json"));
    }

    @Test
    @DisplayName("non-existent saved search → throws IllegalArgumentException")
    void executeSavedSearch_notFound() {
        when(savedSearchRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> savedSearchService.executeSavedSearch(999L, 1L, PageRequest.of(0, 20)));
    }

    @Test
    @DisplayName("empty filter (all nulls) → returns all AVAILABLE apartments")
    void executeSavedSearch_emptyFilter() {
        savedSearch.setFilterJson("{}");
        Apartment apt = Apartment.builder()
                .id(201L)
                .owner(owner)
                .title("Any Apartment")
                .city("Munich")
                .monthlyRent(BigDecimal.valueOf(900))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .build();

        when(savedSearchRepository.findById(10L)).thenReturn(Optional.of(savedSearch));
        when(apartmentRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(apt)));
        when(savedSearchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Page<ApartmentDto> result = savedSearchService.executeSavedSearch(10L, 1L, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
    }

    @Test
    @DisplayName("matchCount accumulates across executions")
    void executeSavedSearch_accumulatesMatchCount() {
        savedSearch.setMatchCount(5);  // previously had 5 matches

        Apartment apt = Apartment.builder()
                .id(202L)
                .owner(owner)
                .title("Another Apartment")
                .city("Berlin")
                .numberOfBedrooms(3)
                .monthlyRent(BigDecimal.valueOf(1500))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .build();

        when(savedSearchRepository.findById(10L)).thenReturn(Optional.of(savedSearch));
        when(apartmentRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(apt)));
        when(savedSearchRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        savedSearchService.executeSavedSearch(10L, 1L, PageRequest.of(0, 20));

        assertEquals(6, savedSearch.getMatchCount(), "matchCount should be 5 + 1 = 6");
    }

        @Test
        @DisplayName("createSavedSearch persists active search with zero match count")
        void createSavedSearch_success() {
                CreateSavedSearchRequest request = CreateSavedSearchRequest.builder()
                                .name("My Search")
                                .filterJson("{\"city\":\"Berlin\"}")
                                .build();

                when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
                when(savedSearchRepository.existsByUserIdAndName(1L, "My Search")).thenReturn(false);
                when(savedSearchRepository.save(any(SavedSearch.class))).thenAnswer(inv -> {
                        SavedSearch ss = inv.getArgument(0);
                        ss.setId(99L);
                        return ss;
                });

                SavedSearchDto dto = savedSearchService.createSavedSearch(1L, request);

                assertEquals(99L, dto.getId());
                assertEquals("My Search", dto.getName());
                verify(savedSearchRepository).save(any(SavedSearch.class));
        }

        @Test
        @DisplayName("createSavedSearch throws when user missing")
        void createSavedSearch_userMissing() {
                CreateSavedSearchRequest request = CreateSavedSearchRequest.builder()
                                .name("My Search")
                                .filterJson("{}")
                                .build();
                when(userRepository.findById(1L)).thenReturn(Optional.empty());

                assertThrows(IllegalArgumentException.class,
                                () -> savedSearchService.createSavedSearch(1L, request));
        }

        @Test
        @DisplayName("createSavedSearch throws on duplicate name")
        void createSavedSearch_duplicateName() {
                CreateSavedSearchRequest request = CreateSavedSearchRequest.builder()
                                .name("My Search")
                                .filterJson("{}")
                                .build();
                when(userRepository.findById(1L)).thenReturn(Optional.of(owner));
                when(savedSearchRepository.existsByUserIdAndName(1L, "My Search")).thenReturn(true);

                assertThrows(IllegalStateException.class,
                                () -> savedSearchService.createSavedSearch(1L, request));
        }

        @Test
        @DisplayName("getSavedSearchesByUser maps repository results")
        void getSavedSearchesByUser_maps() {
                when(savedSearchRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(List.of(savedSearch));

                List<SavedSearchDto> items = savedSearchService.getSavedSearchesByUser(1L);

                assertEquals(1, items.size());
                assertEquals(10L, items.get(0).getId());
        }

        @Test
        @DisplayName("getSavedSearchById validates ownership")
        void getSavedSearchById_authChecks() {
                when(savedSearchRepository.findById(10L)).thenReturn(Optional.of(savedSearch));

                SavedSearchDto ok = savedSearchService.getSavedSearchById(10L, 1L);
                assertEquals(10L, ok.getId());

                assertThrows(SecurityException.class,
                                () -> savedSearchService.getSavedSearchById(10L, 2L));
        }

        @Test
        @DisplayName("toggleActive toggles state and validates ownership")
        void toggleActive_paths() {
                savedSearch.setIsActive(true);
                when(savedSearchRepository.findById(10L)).thenReturn(Optional.of(savedSearch));
                when(savedSearchRepository.save(any(SavedSearch.class))).thenAnswer(inv -> inv.getArgument(0));

                SavedSearchDto toggled = savedSearchService.toggleActive(10L, 1L);
                assertFalse(toggled.getIsActive());

                assertThrows(SecurityException.class,
                                () -> savedSearchService.toggleActive(10L, 7L));
        }

        @Test
        @DisplayName("deleteSavedSearch deletes owned search and rejects unauthorized")
        void deleteSavedSearch_paths() {
                when(savedSearchRepository.findById(10L)).thenReturn(Optional.of(savedSearch));

                savedSearchService.deleteSavedSearch(10L, 1L);
                verify(savedSearchRepository).delete(savedSearch);

                assertThrows(SecurityException.class,
                                () -> savedSearchService.deleteSavedSearch(10L, 4L));
        }

        // ── not-found guards (covers orElseThrow lambda bodies) ─────────────

        @Test
        @DisplayName("getSavedSearchById throws IllegalArgumentException when ID not found")
        void getSavedSearchById_notFound_throws() {
                when(savedSearchRepository.findById(999L)).thenReturn(Optional.empty());
                assertThrows(IllegalArgumentException.class,
                                () -> savedSearchService.getSavedSearchById(999L, 1L));
        }

        @Test
        @DisplayName("toggleActive throws IllegalArgumentException when ID not found")
        void toggleActive_notFound_throws() {
                when(savedSearchRepository.findById(999L)).thenReturn(Optional.empty());
                assertThrows(IllegalArgumentException.class,
                                () -> savedSearchService.toggleActive(999L, 1L));
        }

        @Test
        @DisplayName("deleteSavedSearch throws IllegalArgumentException when ID not found")
        void deleteSavedSearch_notFound_throws() {
                when(savedSearchRepository.findById(999L)).thenReturn(Optional.empty());
                assertThrows(IllegalArgumentException.class,
                                () -> savedSearchService.deleteSavedSearch(999L, 1L));
        }
}
