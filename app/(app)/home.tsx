import { Link } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';

const MODULES = [
  {
    href: '/avisos' as const,
    title: 'Avisos',
    description: 'Alertas e lembretes do veículo ativo.',
  },
  {
    href: '/oleo-motor' as const,
    title: 'Troca de óleo do motor',
    description: 'Registros e acompanhamento do óleo do motor.',
  },
  {
    href: '/oleo-cambio' as const,
    title: 'Troca de óleo de câmbio',
    description: 'Registros e acompanhamento do óleo de câmbio.',
  },
  {
    href: '/arrefecimento' as const,
    title: 'Troca de arrefecimento',
    description: 'Registros do sistema de arrefecimento.',
  },
  {
    href: '/velas-bobinas-correias' as const,
    title: 'Velas, bobinas e correias',
    description: 'Trocas de velas, bobinas e correias.',
  },
];

const Screen = styled.View`
  flex: 1;
  background-color: ${theme.colors.background};
`;

const Content = styled.ScrollView`
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
  margin-bottom: ${theme.spacing.lg}px;
`;

const ModuleCard = styled(Pressable)`
  background-color: ${theme.colors.surface};
  border-radius: ${theme.radii.md}px;
  border-width: 1px;
  border-color: #2a2a2a;
  padding: ${theme.spacing.md}px;
`;

const ModuleTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: 18px;
  font-weight: 700;
  margin-bottom: ${theme.spacing.sm}px;
`;

const ModuleDescription = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 14px;
  line-height: 20px;
`;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <Content
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.xl + insets.bottom,
          gap: theme.spacing.md,
        }}
      >
        <Title>Módulos</Title>
        <Subtitle>Escolha um módulo para acompanhar a manutenção.</Subtitle>

        {MODULES.map((module) => (
          <Link key={module.href} href={module.href} asChild>
            <ModuleCard>
              <ModuleTitle>{module.title}</ModuleTitle>
              <ModuleDescription>{module.description}</ModuleDescription>
            </ModuleCard>
          </Link>
        ))}
      </Content>
    </Screen>
  );
}
