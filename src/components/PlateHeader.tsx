import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import styled from '../theme/styled';
import { theme } from '../theme/theme';
import { useVehicles } from '../vehicles/VehicleContext';

const Header = styled.View<{ paddingTop: number }>`
  background-color: ${theme.colors.background};
  border-bottom-width: 1px;
  border-bottom-color: #2a2a2a;
  padding-top: ${(props) => props.paddingTop}px;
  padding-horizontal: ${theme.spacing.md}px;
  padding-bottom: ${theme.spacing.md}px;
`;

const PlateButton = styled(Pressable)`
  align-self: flex-start;
  background-color: ${theme.colors.surface};
  border-width: 1px;
  border-color: ${theme.colors.primary};
  border-radius: ${theme.radii.md}px;
  padding-horizontal: ${theme.spacing.md}px;
  padding-vertical: ${theme.spacing.sm}px;
`;

const PlateText = styled.Text`
  color: ${theme.colors.primary};
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
`;

export function PlateHeader() {
  const insets = useSafeAreaInsets();
  const { activeVehicle } = useVehicles();

  if (!activeVehicle) {
    return null;
  }

  return (
    <Header paddingTop={Math.max(insets.top, theme.spacing.md)}>
      <PlateButton onPress={() => router.push('/vehicles')}>
        <PlateText>{activeVehicle.plate}</PlateText>
      </PlateButton>
    </Header>
  );
}
