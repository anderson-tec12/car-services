import { router } from 'expo-router';

import { VehicleForm } from '../src/components/VehicleForm';

export default function RegisterVehicleScreen() {
  return (
    <VehicleForm
      title="Novo veículo"
      subtitle="Cadastre outro veículo para acompanhar a manutenção."
      submitLabel="Salvar veículo"
      onSuccess={() => router.replace('/home')}
    />
  );
}
