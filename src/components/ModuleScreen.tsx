import styled from '../theme/styled';
import { theme } from '../theme/theme';

type ModuleScreenProps = {
  title: string;
  description: string;
};

const Container = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
  padding: ${theme.spacing.xl}px;
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
  return (
    <Container>
      <Title>{title}</Title>
      <Description>{description}</Description>
    </Container>
  );
}
