package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.FavoriteDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.UserFavorite;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserFavoriteRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FavoriteServiceImpl")
class FavoriteServiceTest {

    @Mock private UserFavoriteRepository favoriteRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApartmentRepository apartmentRepository;

    @InjectMocks private FavoriteServiceImpl favoriteService;

    private User user;
    private Apartment apartment;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("u@test.com").firstName("U").lastName("T").build();
        apartment = Apartment.builder().id(9L).title("Apt").owner(user)
            .status(Apartment.ApartmentStatus.AVAILABLE)
            .build();
    }

    @Test
    void addFavorite_success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(apartmentRepository.findById(9L)).thenReturn(Optional.of(apartment));
        when(favoriteRepository.existsByUserIdAndApartmentId(1L, 9L)).thenReturn(false);
        when(favoriteRepository.save(any(UserFavorite.class))).thenAnswer(inv -> {
            UserFavorite uf = inv.getArgument(0);
            uf.setId(100L);
            return uf;
        });

        FavoriteDto result = favoriteService.addFavorite(1L, 9L);

        assertEquals(100L, result.getId());
        assertEquals(9L, result.getApartmentId());
    }

    @Test
    void addFavorite_duplicate_throws() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(apartmentRepository.findById(9L)).thenReturn(Optional.of(apartment));
        when(favoriteRepository.existsByUserIdAndApartmentId(1L, 9L)).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> favoriteService.addFavorite(1L, 9L));
    }

    @Test
    void addFavorite_userNotFound_throws() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> favoriteService.addFavorite(1L, 9L));
    }

    @Test
    void addFavorite_apartmentNotFound_throws() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(apartmentRepository.findById(9L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> favoriteService.addFavorite(1L, 9L));
    }

    @Test
    void removeFavorite_notFound_throws() {
        when(favoriteRepository.existsByUserIdAndApartmentId(1L, 9L)).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> favoriteService.removeFavorite(1L, 9L));
    }

    @Test
    void removeFavorite_success() {
        when(favoriteRepository.existsByUserIdAndApartmentId(1L, 9L)).thenReturn(true);

        favoriteService.removeFavorite(1L, 9L);

        verify(favoriteRepository).deleteByUserIdAndApartmentId(1L, 9L);
    }

    @Test
    void getUserFavorites_mapsPage() {
        UserFavorite uf = UserFavorite.builder().id(3L).user(user).apartment(apartment).build();
        Page<UserFavorite> page = new PageImpl<>(List.of(uf), PageRequest.of(0, 10), 1);
        when(favoriteRepository.findByUserId(eq(1L), any())).thenReturn(page);

        Page<FavoriteDto> result = favoriteService.getUserFavorites(1L, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(9L, result.getContent().get(0).getApartmentId());
    }

    @Test
    void getUserFavorites_emptyPage() {
        when(favoriteRepository.findByUserId(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        Page<FavoriteDto> result = favoriteService.getUserFavorites(1L, PageRequest.of(0, 10));

        assertTrue(result.getContent().isEmpty());
        assertEquals(0, result.getTotalElements());
    }

    @Test
    void isFavorited_delegatesRepository() {
        when(favoriteRepository.existsByUserIdAndApartmentId(1L, 9L)).thenReturn(true);
        assertTrue(favoriteService.isFavorited(1L, 9L));
    }

    @Test
    void isFavorited_falseCase() {
        when(favoriteRepository.existsByUserIdAndApartmentId(1L, 9L)).thenReturn(false);
        assertFalse(favoriteService.isFavorited(1L, 9L));
    }

    @Test
    void getFavoriteCount_delegatesRepository() {
        when(favoriteRepository.countByUserId(1L)).thenReturn(4L);
        assertEquals(4L, favoriteService.getFavoriteCount(1L));
    }

    @Test
    void getFavoriteCount_zero() {
        when(favoriteRepository.countByUserId(1L)).thenReturn(0L);
        assertEquals(0L, favoriteService.getFavoriteCount(1L));
    }
}
