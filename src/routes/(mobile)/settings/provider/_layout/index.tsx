'use client';

import { useEffect } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';

import ProviderMenu from '../../../../(main)/settings/provider/ProviderMenu';

const Layout = () => {
  const params = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { showProvider } = useServerConfigStore(featureFlagsSelectors);

  useEffect(() => {
    if (showProvider === false) {
      navigate('/settings/service-model', { replace: true });
    }
  }, [navigate, showProvider]);

  const handleProviderSelect = (providerKey: string) => {
    navigate(`/settings/provider/${providerKey}`);
  };

  if (showProvider === false) return null;

  return params.providerId === 'all' ? (
    <ProviderMenu mobile={true} onProviderSelect={handleProviderSelect} />
  ) : (
    <Outlet />
  );
};

export default Layout;
