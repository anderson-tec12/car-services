import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform } from 'react-native';

import styled from '../theme/styled';
import { theme } from '../theme/theme';
import { useVehicles } from '../vehicles/VehicleContext';

type VehicleFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  onSuccess: () => void;
};

const Screen = styled.SafeAreaView`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Content = styled.ScrollView.attrs({
  contentContainerStyle: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  keyboardShouldPersistTaps: 'handled',
})`
  flex: 1;
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
  margin-bottom: ${theme.spacing.xl}px;
`;

const Label = styled.Text`
  color: ${theme.colors.text};
  font-size: 14px;
  font-weight: 600;
  margin-bottom: ${theme.spacing.sm}px;
`;

const Field = styled.TextInput.attrs({
  placeholderTextColor: theme.colors.textSecondary,
})`
  background-color: ${theme.colors.surface};
  color: ${theme.colors.text};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
  font-size: 16px;
  margin-bottom: ${theme.spacing.lg}px;
`;

const SubmitButton = styled.Pressable<{ disabled?: boolean }>`
  background-color: ${theme.colors.primary};
  border-radius: ${theme.radii.md}px;
  padding: ${theme.spacing.md}px;
  align-items: center;
  opacity: ${(props) => (props.disabled ? 0.6 : 1)};
`;

const SubmitLabel = styled.Text`
  color: ${theme.colors.background};
  font-size: 16px;
  font-weight: 700;
`;

export function VehicleForm({
  title,
  subtitle,
  submitLabel,
  onSuccess,
}: VehicleFormProps) {
  const { createVehicle } = useVehicles();
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await createVehicle({ brand, model, plate });
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível salvar o veículo.';
      Alert.alert('Atenção', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Content>
          <Title>{title}</Title>
          <Subtitle>{subtitle}</Subtitle>

          <Label>Marca</Label>
          <Field
            value={brand}
            onChangeText={setBrand}
            placeholder="Ex.: Volkswagen"
            autoCapitalize="words"
            editable={!isSubmitting}
          />

          <Label>Modelo</Label>
          <Field
            value={model}
            onChangeText={setModel}
            placeholder="Ex.: Gol"
            autoCapitalize="words"
            editable={!isSubmitting}
          />

          <Label>Placa</Label>
          <Field
            value={plate}
            onChangeText={setPlate}
            placeholder="Ex.: ABC1D23"
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isSubmitting}
          />

          <SubmitButton disabled={isSubmitting} onPress={handleSubmit}>
            <SubmitLabel>{isSubmitting ? 'Salvando...' : submitLabel}</SubmitLabel>
          </SubmitButton>
        </Content>
      </KeyboardAvoidingView>
    </Screen>
  );
}
