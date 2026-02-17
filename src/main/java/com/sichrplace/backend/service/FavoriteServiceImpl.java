package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.FavoriteDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.UserFavorite;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserFavoriteRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteServiceImpl implements FavoriteService {

    private final UserFavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;

    @Override
    @Transactional
    public FavoriteDto addFavorite(Long userId, Long apartmentId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        if (favoriteRepository.existsByUserIdAndApartmentId(userId, apartmentId)) {
            throw new IllegalStateException("Apartment already in favorites");
        }

        UserFavorite favorite = new UserFavorite();
        favorite.setUser(user);
        favorite.setApartment(apartment);

        UserFavorite saved = favoriteRepository.save(favorite);
        log.info("User {} added apartment {} to favorites", userId, apartmentId);
        return FavoriteDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public void removeFavorite(Long userId, Long apartmentId) {
        if (!favoriteRepository.existsByUserIdAndApartmentId(userId, apartmentId)) {
            throw new IllegalArgumentException("Favorite not found");
        }
        favoriteRepository.deleteByUserIdAndApartmentId(userId, apartmentId);
        log.info("User {} removed apartment {} from favorites", userId, apartmentId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<FavoriteDto> getUserFavorites(Long userId, Pageable pageable) {
        return favoriteRepository.findByUserId(userId, pageable)
                .map(FavoriteDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isFavorited(Long userId, Long apartmentId) {
        return favoriteRepository.existsByUserIdAndApartmentId(userId, apartmentId);
    }

    @Override
    @Transactional(readOnly = true)
    public long getFavoriteCount(Long userId) {
        return favoriteRepository.countByUserId(userId);
    }
}
