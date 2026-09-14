import { AppStoreProvider } from '@/services/store/AppStoreProvider';
import { NavigationProvider } from '@/navigation/NavigationProvider';
import { AppRoot } from '@/screens/AppRoot';

export default function App() {
  return (
    <AppStoreProvider>
      <NavigationProvider>
        <AppRoot />
      </NavigationProvider>
    </AppStoreProvider>
  );
}
