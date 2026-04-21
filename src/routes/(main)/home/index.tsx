import { Flexbox } from '@lobehub/ui';
import { type FC } from 'react';
import { useLocation } from 'react-router-dom';

import HomePageTracker from '@/components/Analytics/HomePageTracker';
import PageTitle from '@/components/PageTitle';
import NavHeader from '@/features/NavHeader';
import WideScreenContainer from '@/features/WideScreenContainer';

import HomeContent from './features';

const Home: FC = () => {
  const { pathname } = useLocation();
  const isHomeRoute = pathname === '/';

  return (
    <>
      {isHomeRoute && <PageTitle title="" />}
      <HomePageTracker />
      <NavHeader right={<Flexbox horizontal align="center" />} />
      <Flexbox
        height={'100%'}
        style={{ overflowY: 'auto', paddingBlock: '44px 16vh' }}
        width={'100%'}
      >
        <WideScreenContainer height={'100%'} wrapperStyle={{ height: '100%' }}>
          <HomeContent />
        </WideScreenContainer>
      </Flexbox>
    </>
  );
};

export default Home;
