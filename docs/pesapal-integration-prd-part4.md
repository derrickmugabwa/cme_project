# PesaPal Integration PRD - Part 4: Frontend Implementation and Testing Plan

## 8. Frontend Implementation

### 8.1 Update Units Client Component

Update the existing units client component to include PesaPal as a payment option:

```typescript
// app/dashboard/units/client.tsx (partial update)

// Add PesaPal to the payment method options
const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mpesa' | 'paystack' | 'pesapal'>('mpesa');

// Update the payment tabs component
<Tabs defaultValue="mpesa" className="w-full" onValueChange={(value) => 
  setSelectedPaymentMethod(value as 'mpesa' | 'paystack' | 'pesapal')
}>
  <TabsList className="grid grid-cols-3 mb-4">
    <TabsTrigger value="mpesa">M-Pesa</TabsTrigger>
    <TabsTrigger value="paystack">Card</TabsTrigger>
    <TabsTrigger value="pesapal">PesaPal</TabsTrigger>
  </TabsList>
  
  <TabsContent value="mpesa">
    {/* Existing M-Pesa content */}
  </TabsContent>
  
  <TabsContent value="paystack">
    {/* Existing Paystack content */}
  </TabsContent>
  
  <TabsContent value="pesapal">
    <div className="space-y-4">
      <div className="flex items-center justify-center mb-4">
        <Image 
          src="/images/payment-logos/pesapal-logo.png" 
          alt="PesaPal" 
          width={120} 
          height={40} 
          className="object-contain" 
        />
      </div>
      
      <p className="text-sm text-center text-muted-foreground">
        Pay with credit/debit card, mobile money, or bank transfer via PesaPal
      </p>
      
      <Button 
        onClick={() => handleTopup('pesapal')} 
        className="w-full" 
        disabled={isProcessing}
      >
        {isProcessing ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay with PesaPal</>
        )}
      </Button>
    </div>
  </TabsContent>
</Tabs>

// Update the handleTopup function to include PesaPal
const handleTopup = async (method: 'mpesa' | 'paystack' | 'pesapal') => {
  // Existing validation code...
  
  setIsProcessing(true);

  try {
    // Step 1: Create a payment transaction (existing code)
    
    // Step 2: Process payment based on method
    if (method === 'mpesa') {
      // Existing M-Pesa code...
    } else if (method === 'paystack') {
      // Existing Paystack code...
    } else if (method === 'pesapal') {
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Initiate PesaPal payment
      const pesapalResponse = await fetch('/api/payments/pesapal/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          transaction_id: initData.transaction_id,
          email: userEmail || 'user@example.com' // Use the email from user profile
        }),
      });
      
      const pesapalData = await pesapalResponse.json();
      
      if (!pesapalResponse.ok) {
        throw new Error(pesapalData.error || 'Failed to initiate PesaPal payment');
      }
      
      // Redirect to PesaPal payment page
      window.location.href = pesapalData.authorization_url;
    }
  } catch (error) {
    // Existing error handling code...
  }
};
```

### 8.2 Update Payment Completion Page

Update the existing payment completion page to handle PesaPal redirects:

```typescript
// app/dashboard/units/payment-complete/page.tsx (partial update)

// Add support for PesaPal parameters in the useEffect
useEffect(() => {
  const verifyPayment = async () => {
    // Get parameters from URL
    const reference = searchParams.get('reference'); // Paystack reference
    const orderTrackingId = searchParams.get('OrderTrackingId'); // PesaPal tracking ID
    
    if (!reference && !orderTrackingId) {
      setStatus('error');
      setMessage('Invalid payment reference');
      return;
    }
    
    try {
      let response;
      
      // Determine which payment provider to verify with
      if (reference) {
        // Verify Paystack payment (existing code)
        response = await fetch(`/api/payments/paystack/verify/${reference}`);
      } else if (orderTrackingId) {
        // Verify PesaPal payment
        response = await fetch(`/api/payments/pesapal/verify/${orderTrackingId}`);
      }
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatus('success');
        setMessage(`${data.units} units have been added to your account`);
      } else {
        setStatus('error');
        setMessage(data.message || 'Payment verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred while verifying your payment');
    }
  };
  
  verifyPayment();
}, [reference, searchParams]);
```

### 8.3 Add PesaPal Logo

Add the PesaPal logo to the payment logos folder:

1. Download the PesaPal logo
2. Save it as `public/images/payment-logos/pesapal-logo.png`
3. Update the `PaymentLogos` component to include PesaPal

## 9. Testing Plan

### 9.1 Unit Testing

1. Test PesaPal API client functions
   - Test token acquisition
   - Test order submission
   - Test transaction status verification

2. Test API endpoints
   - Test initiate endpoint with valid/invalid data
   - Test IPN handler with various status responses
   - Test verification endpoint with different scenarios

### 9.2 Integration Testing

1. Test the complete payment flow
   - Initiate payment
   - Process redirect to PesaPal
   - Handle callback/IPN
   - Verify units are added to user account

2. Test error scenarios
   - Invalid credentials
   - Network failures
   - Payment cancellation
   - Payment failure

### 9.3 User Acceptance Testing

1. Test the UI/UX of the payment flow
   - Verify tab selection works correctly
   - Confirm loading states display properly
   - Ensure error messages are clear and helpful

2. Test on different devices and browsers
   - Desktop (Chrome, Firefox, Safari, Edge)
   - Mobile (iOS, Android)

## 10. Deployment Plan

### 10.1 Pre-Deployment Checklist

1. Ensure all environment variables are configured
2. Verify PesaPal IPN ID is registered
3. Confirm callback URLs are correctly set
4. Test in sandbox environment

### 10.2 Deployment Steps

1. Deploy backend API endpoints
2. Deploy frontend components
3. Update payment settings in database
4. Monitor initial transactions

### 10.3 Post-Deployment Verification

1. Process a test transaction in production
2. Verify IPN callbacks are received
3. Confirm units are correctly added to user account

## 11. Security Considerations

1. **API Key Protection**:
   - Store PesaPal credentials as environment variables
   - Never expose keys in client-side code

2. **Data Validation**:
   - Validate all input data before processing
   - Sanitize data received from PesaPal callbacks

3. **Transaction Verification**:
   - Always verify transaction status with PesaPal API
   - Implement idempotent processing to prevent double-crediting

4. **Error Handling**:
   - Log all errors with appropriate context
   - Provide user-friendly error messages

## 12. Conclusion

This integration will add PesaPal as a third payment option in our units system, providing users with more flexibility in how they purchase units. The implementation follows the same pattern as our existing payment methods, ensuring consistency in the codebase and user experience.

Once approved, the development work can begin with the database updates, followed by the backend API implementation, and finally the frontend components. The entire integration is estimated to take approximately 1-2 weeks of development time, including testing and deployment.
