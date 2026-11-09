'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** «Reportes» se unificó con «Insights» (era el mismo microfrontend): se conservan los enlaces antiguos. */
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/insights/');
  }, [router]);
  return null;
}
