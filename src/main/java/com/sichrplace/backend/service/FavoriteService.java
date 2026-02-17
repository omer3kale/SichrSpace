package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.FavoriteDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FavoriteService {

    FavoriteDto addFavorite(Long userId, Long apartmentId);

    void removeFavorite(Long userId, Long apartmentId);

    Page<FavoriteDto> getUserFavorites(Long userId, Pageable pageable);

    boolean isFavorited(Long userId, Long apartmentId);

    long getFavoriteCount(Long userId);
}
