package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, Long> {

    Optional<PaymentTransaction> findByProviderTransactionId(String providerTransactionId);

    List<PaymentTransaction> findByReference(String reference);
}
