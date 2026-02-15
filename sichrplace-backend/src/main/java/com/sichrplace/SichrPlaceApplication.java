package com.sichrplace;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SichrPlaceApplication {

    public static void main(String[] args) {
        SpringApplication.run(SichrPlaceApplication.class, args);
    }
}
