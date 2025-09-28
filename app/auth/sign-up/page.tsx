import { MultiStepRegistrationForm } from '@/components/registration/MultiStepRegistrationForm'
import { fetchLogo } from '@/lib/logo-service'

export default async function Page() {
  const logo = await fetchLogo();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-4xl">
        <MultiStepRegistrationForm logo={logo} />
      </div>
    </div>
  )
}
