import { CertificateVerifier } from '@/components/certificates/certificate-verifier';

export const metadata = {
  title: 'Verify Certificate | CME Platform',
  description: 'Verify the authenticity of a certificate'
};

export default function VerifyPage() {
  return (
    <div className="container max-w-5xl py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Certificate Verification</h1>
        <p className="mt-2 text-muted-foreground">
          Verify the authenticity of certificates issued by our platform
        </p>
      </div>
      
      <CertificateVerifier />
      
      <div className="mt-12 rounded-lg bg-muted p-6">
        <h2 className="text-xl font-semibold">About Certificate Verification</h2>
        <p className="mt-2 text-muted-foreground">
          Our certificates contain a unique certificate number that can be used to verify their authenticity.
          Enter the certificate number in the form above to check if it was issued by our platform and view
          details about the certificate holder and the webinar they completed.
        </p>
      </div>
    </div>
  );
}
