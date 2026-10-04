import { useSafeAreaInsets } from 'react-native-safe-area-context';

import styled from '../theme/styled';
import { theme } from '../theme/theme';

type ModuleScreenProps = {
  title: string;
  description: string;
};

const Container = styled.View<{ paddingBottom: number }>`
  flex: 1;
  background-color: ${theme.colors.background};
  padding: ${theme.spacing.xl}px;
  padding-bottom: ${(props) => props.paddingBottom}px;
`;

const Title = styled.Text`
  color: ${theme.colors.primary};
  font-size: 24px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.md}px;
`;

const Description = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 16px;
  line-height: 24px;
`;

export function ModuleScreen({ title, description }: ModuleScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <Container paddingBottom={theme.spacing.xl + insets.bottom}>
      <Title>{title}</Title>
      <Description>{description}</Description>
    </Container>
  );
}
