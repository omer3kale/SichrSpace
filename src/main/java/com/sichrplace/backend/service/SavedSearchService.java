package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.CreateSavedSearchRequest;
import com.sichrplace.backend.dto.SavedSearchDto;

import java.util.List;

public interface SavedSearchService {
    SavedSearchDto createSavedSearch(Long userId, CreateSavedSearchRequest request);
    List<SavedSearchDto> getSavedSearchesByUser(Long userId);
    SavedSearchDto getSavedSearchById(Long id, Long userId);
    SavedSearchDto toggleActive(Long id, Long userId);
    void deleteSavedSearch(Long id, Long userId);
}
