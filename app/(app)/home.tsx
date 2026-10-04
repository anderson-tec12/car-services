import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';

const MODULES = [
  {
    href: '/avisos' as const,
    title: 'Avisos',
    description: 'Alertas e lembretes do veículo ativo.',
    icon: { ios: 'bell' as const, android: 'notifications' as const, web: 'notifications' as const },
  },
  {
    href: '/oleo-motor' as const,
    title: 'Troca de óleo do motor',
    description: 'Registros e acompanhamento do óleo do motor.',
    icon: { ios: 'drop.fill' as const, android: 'oil_barrel' as const, web: 'oil_barrel' as const },
  },
  {
    href: '/oleo-cambio' as const,
    title: 'Troca de óleo de câmbio',
    description: 'Registros e acompanhamento do óleo de câmbio.',
    icon: { ios: 'gearshape' as const, android: 'settings' as const, web: 'settings' as const },
  },
  {
    href: '/arrefecimento' as const,
    title: 'Troca de arrefecimento',
    description: 'Registros do sistema de arrefecimento.',
    icon: {
      ios: 'thermometer.medium' as const,
      android: 'device_thermostat' as const,
      web: 'device_thermostat' as const,
    },
  },
  {
    href: '/velas-bobinas-correias' as const,
    title: 'Velas, bobinas e correias',
    description: 'Trocas de velas, bobinas e correias.',
    icon: { ios: 'bolt.fill' as const, android: 'bolt' as const, web: 'bolt' as const },
  },
];

const MODULE_ROWS = Array.from({ length: Math.ceil(MODULES.length / 2) }, (_, index) =>
  MODULES.slice(index * 2, index * 2 + 2)
);

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

const Grid = styled.View`
  gap: 0;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: stretch;
`;

const Cell = styled.View`
  width: 50%;
`;

const ModuleCard = styled(Pressable)`
  flex: 1;
  padding: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: #2a2a2a;
`;

const ModuleTitle = styled.Text`
  color: ${theme.colors.text};
  font-size: 16px;
  font-weight: 700;
  margin-top: ${theme.spacing.sm}px;
  margin-bottom: ${theme.spacing.sm}px;
`;

const ModuleDescription = styled.Text`
  color: ${theme.colors.textSecondary};
  font-size: 13px;
  line-height: 18px;
`;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <Screen>
      <Content
        contentContainerStyle={{
          padding: theme.spacing.xl,
          paddingBottom: theme.spacing.xl + insets.bottom,
        }}
      >
        <Title>Módulos</Title>
        <Subtitle>Escolha um módulo para acompanhar a manutenção.</Subtitle>

        <Grid>
          {MODULE_ROWS.map((row) => (
            <Row key={row.map((module) => module.href).join('-')}>
              {row.map((module) => (
                <Cell key={module.href}>
                  <Link href={module.href} asChild>
                    <ModuleCard>
                      <SymbolView
                        name={module.icon}
                        tintColor={theme.colors.primary}
                        size={28}
                      />
                      <ModuleTitle>{module.title}</ModuleTitle>
                      <ModuleDescription>{module.description}</ModuleDescription>
                    </ModuleCard>
                  </Link>
                </Cell>
              ))}
            </Row>
          ))}
        </Grid>
      </Content>
    </Screen>
  );
}
