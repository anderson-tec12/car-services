import { router } from 'expo-router';
import { FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import styled from '../src/theme/styled';
import { theme } from '../src/theme/theme';
import { useVehicles } from '../src/vehicles/VehicleContext';
import type { Vehicle } from '../src/db/vehicles';

const Screen = styled(SafeAreaView)`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Header = styled.View`
  padding: ${theme.spacing.xl}px ${theme.spacing.xl}px ${theme.spacing.md}px;
`;

const Title = styled.Text`
  color: ${theme.colors.primary};
  font-size: 28px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm}px;
`;

const Subtitle = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  line-height: 24px;
`;

const Card = styled(Pressable)<{ active: boolean }>`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: ${(props) => (props.active ? theme.colors.primary : '#2a2a2a')};
  padding: ${theme.spacing.md}px;
  margin-horizontal: ${theme.spacing.xl}px;
  margin-bottom: ${theme.spacing.md}px;
`;

const Plate = styled.Text`
  color: ${theme.colors.primary};
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const Meta = styled.Text`
  color: ${theme.colors.text};
  font-size: 15px;
`;

const ActiveBadge = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 13px;
  margin-top: ${theme.spacing.sm}px;
`;

const Footer = styled.View`
  padding: ${theme.spacing.md}px ${theme.spacing.xl}px ${theme.spacing.xl}px;
  gap: ${theme.spacing.md}px;
`;

const PrimaryButton = styled(Pressable)`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
`;

const SecondaryButton = styled(Pressable)`
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  align-items: center;
`;

const PrimaryLabel = styled.Text`
  color: ${theme.colors.background};
  font-size: 16px;
  font-weight: 700;
`;

const SecondaryLabel = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 600;
`;

function VehicleCard({
  vehicle,
  onPress,
}: {
  vehicle: Vehicle;
  onPress: () => void;
}) {
  return (
    <Card active={vehicle.isActive} onPress={onPress}>
      <Plate>{vehicle.plate}</Plate>
      <Meta>
        {vehicle.brand} {vehicle.model}
      </Meta>
      {vehicle.isActive ? <ActiveBadge>Veículo ativo</ActiveBadge> : null}
    </Card>
  );
}

export default function VehiclesScreen() {
  const { vehicles, setActiveVehicle } = useVehicles();

  async function handleSelect(vehicle: Vehicle) {
    if (!vehicle.isActive) {
      await setActiveVehicle(vehicle.id);
    }
    router.back();
  }

  return (
    <Screen>
      <Header>
        <Title>Veículos</Title>
        <Subtitle>Toque em um veículo para torná-lo ativo.</Subtitle>
      </Header>

      <FlatList
        style={{ flex: 1 }}
        data={vehicles}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <VehicleCard vehicle={item} onPress={() => handleSelect(item)} />
        )}
      />

      <Footer>
        <PrimaryButton onPress={() => router.push('/register')}>
          <PrimaryLabel>Cadastrar outro veículo</PrimaryLabel>
        </PrimaryButton>
        <SecondaryButton onPress={() => router.back()}>
          <SecondaryLabel>Voltar</SecondaryLabel>
        </SecondaryButton>
      </Footer>
    </Screen>
  );
}
