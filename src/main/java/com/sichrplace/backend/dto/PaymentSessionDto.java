package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.PaymentTransaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentSessionDto {
    private Long transactionId;
    private String provider;
    private String status;
    private String redirectUrl;

    public static PaymentSessionDto from(PaymentTransaction tx, String redirectUrl) {
        return PaymentSessionDto.builder()
                .transactionId(tx.getId())
                .provider(tx.getProvider())
                .status(tx.getStatus().name())
                .redirectUrl(redirectUrl)
                .build();
    }
}
