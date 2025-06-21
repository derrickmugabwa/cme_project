# PesaPal Integration PRD - Part 1: Overview and Requirements

## 1. Introduction

This document outlines the plan for integrating PesaPal as a third payment method in the CME platform's units system, alongside the existing M-Pesa and Paystack options. PesaPal is a popular payment gateway in East Africa that supports multiple payment methods including credit/debit cards, mobile money, and bank transfers.

## 2. Current System Analysis

The current payment system consists of:

- **Database tables**: `payment_transactions`, `payment_settings`
- **SQL functions**: `process_successful_payment`, `mark_payment_failed`, `get_units_exchange_rate`
- **API endpoints**: 
  - `/api/payments/mpesa/initiate`
  - `/api/payments/mpesa/callback`
  - `/api/payments/mpesa/verify`
  - `/api/payments/paystack/initiate`
  - `/api/payments/paystack/webhook`
  - `/api/payments/paystack/verify`
  - `/api/payments/status`
- **Frontend components**: Tab-based payment UI in the units dashboard

The existing implementation follows a consistent pattern:
1. Create a pending transaction record
2. Initiate payment with the provider
3. Process callback/webhook from provider
4. Update transaction status and add units on success

## 3. Requirements for PesaPal Integration

### 3.1 Functional Requirements

1. Users should be able to select PesaPal as a payment option in the units top-up interface
2. The system should support PesaPal's iframe integration method
3. The system should handle PesaPal's IPN (Instant Payment Notification) callbacks
4. The system should verify payment status with PesaPal API
5. The system should process successful payments by adding units to user accounts
6. The system should handle failed payments gracefully
7. Admins should be able to view and manage PesaPal transactions

### 3.2 Technical Requirements

1. Integration with PesaPal API v3.0
2. Secure handling of PesaPal credentials
3. Proper error handling and logging
4. Consistent transaction processing with existing payment methods
5. Responsive UI that works on mobile and desktop devices
