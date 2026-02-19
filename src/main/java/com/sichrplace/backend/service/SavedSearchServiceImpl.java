package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.CreateSavedSearchRequest;
import com.sichrplace.backend.dto.SavedSearchDto;
import com.sichrplace.backend.model.SavedSearch;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.SavedSearchRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SavedSearchServiceImpl implements SavedSearchService {

    private final SavedSearchRepository savedSearchRepository;
    private final UserRepository userRepository;

    @Override
    public SavedSearchDto createSavedSearch(Long userId, CreateSavedSearchRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (savedSearchRepository.existsByUserIdAndName(userId, request.getName())) {
            throw new IllegalStateException("A saved search with name '"
                    + request.getName() + "' already exists");
        }

        SavedSearch savedSearch = SavedSearch.builder()
                .user(user)
                .name(request.getName())
                .filterJson(request.getFilterJson())
                .isActive(true)
                .matchCount(0)
                .build();

        savedSearch = savedSearchRepository.save(savedSearch);
        log.info("Saved search created id={}, userId={}, name='{}'",
                savedSearch.getId(), userId, request.getName());
        return SavedSearchDto.fromEntity(savedSearch);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavedSearchDto> getSavedSearchesByUser(Long userId) {
        return savedSearchRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(SavedSearchDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SavedSearchDto getSavedSearchById(Long id, Long userId) {
        SavedSearch savedSearch = savedSearchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Saved search not found"));

        if (!savedSearch.getUser().getId().equals(userId)) {
            throw new SecurityException("Not authorized to view this saved search");
        }

        return SavedSearchDto.fromEntity(savedSearch);
    }

    @Override
    public SavedSearchDto toggleActive(Long id, Long userId) {
        SavedSearch savedSearch = savedSearchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Saved search not found"));

        if (!savedSearch.getUser().getId().equals(userId)) {
            throw new SecurityException("Not authorized to modify this saved search");
        }

        savedSearch.setIsActive(!savedSearch.getIsActive());
        savedSearch = savedSearchRepository.save(savedSearch);
        log.info("Saved search toggled id={}, active={}", id, savedSearch.getIsActive());
        return SavedSearchDto.fromEntity(savedSearch);
    }

    @Override
    public void deleteSavedSearch(Long id, Long userId) {
        SavedSearch savedSearch = savedSearchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Saved search not found"));

        if (!savedSearch.getUser().getId().equals(userId)) {
            throw new SecurityException("Not authorized to delete this saved search");
        }

        savedSearchRepository.delete(savedSearch);
        log.info("Saved search deleted id={}, userId={}", id, userId);
    }
}
