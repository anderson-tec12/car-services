import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import styled from '../../src/theme/styled';
import { theme } from '../../src/theme/theme';

const AVISOS_MODULE = {
  href: '/avisos' as const,
  title: 'Avisos',
  description: 'Alertas e lembretes do veículo ativo.',
  icon: { ios: 'bell' as const, android: 'notifications' as const, web: 'notifications' as const },
};

const MODULES = [
  {
    href: '/orcamentos' as const,
    title: 'Orçamentos',
    description: 'Cotações com itens, preços e aprovação.',
    icon: {
      ios: 'doc.text.fill' as const,
      android: 'request_quote' as const,
      web: 'request_quote' as const,
    },
  },
  {
    href: '/gastos' as const,
    title: 'Gastos',
    description: 'Soma dos orçamentos já aprovados.',
    icon: {
      ios: 'creditcard.fill' as const,
      android: 'payments' as const,
      web: 'payments' as const,
    },
  },
  {
    href: '/ocorrencias' as const,
    title: 'Ocorrências',
    description: 'Relatos de problemas e soluções do veículo.',
    icon: {
      ios: 'exclamationmark.triangle.fill' as const,
      android: 'warning' as const,
      web: 'warning' as const,
    },
  },
  {
    href: '/oleo-motor' as const,
    title: 'Óleo do motor',
    description: 'Registros e acompanhamento do óleo do motor.',
    icon: { ios: 'drop.fill' as const, android: 'oil_barrel' as const, web: 'oil_barrel' as const },
  },
  {
    href: '/oleo-cambio' as const,
    title: 'Óleo de câmbio',
    description: 'Registros e acompanhamento do óleo de câmbio.',
    icon: { ios: 'gearshape' as const, android: 'settings' as const, web: 'settings' as const },
  },
  {
    href: '/arrefecimento' as const,
    title: 'Arrefecimento',
    description: 'Registros do sistema de arrefecimento.',
    icon: {
      ios: 'thermometer.medium' as const,
      android: 'device_thermostat' as const,
      web: 'device_thermostat' as const,
    },
  },
  {
    href: '/velas' as const,
    title: 'Velas',
    description: 'Registros e acompanhamento das velas.',
    icon: { ios: 'bolt.fill' as const, android: 'bolt' as const, web: 'bolt' as const },
  },
  {
    href: '/bobinas' as const,
    title: 'Bobinas',
    description: 'Registros e acompanhamento das bobinas.',
    icon: {
      ios: 'bolt.horizontal.fill' as const,
      android: 'electrical_services' as const,
      web: 'electrical_services' as const,
    },
  },
  {
    href: '/correias' as const,
    title: 'Correias',
    description: 'Registros e acompanhamento das correias.',
    icon: {
      ios: 'arrow.triangle.2.circlepath' as const,
      android: 'sync' as const,
      web: 'sync' as const,
    },
  },
  {
    href: '/filtro-combustivel' as const,
    title: 'Filtro de combustível',
    description: 'Registros e acompanhamento do filtro de combustível.',
    icon: {
      ios: 'fuelpump.fill' as const,
      android: 'local_gas_station' as const,
      web: 'local_gas_station' as const,
    },
  },
  {
    href: '/filtro-ar' as const,
    title: 'Filtro de ar',
    description: 'Registros e acompanhamento do filtro de ar.',
    icon: { ios: 'wind' as const, android: 'air' as const, web: 'air' as const },
  },
  {
    href: '/suspensao-dianteira' as const,
    title: 'Suspensão dianteira',
    description: 'Registros e acompanhamento da suspensão dianteira.',
    icon: {
      ios: 'car.side' as const,
      android: 'directions_car' as const,
      web: 'directions_car' as const,
    },
  },
  {
    href: '/suspensao-traseira' as const,
    title: 'Suspensão traseira',
    description: 'Registros e acompanhamento da suspensão traseira.',
    icon: {
      ios: 'car.rear' as const,
      android: 'airport_shuttle' as const,
      web: 'airport_shuttle' as const,
    },
  },
  {
    href: '/freios' as const,
    title: 'Freios',
    description: 'Registros e acompanhamento do sistema de freios.',
    icon: {
      ios: 'abs.brakesignal' as const,
      android: 'car_crash' as const,
      web: 'car_crash' as const,
    },
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

const FullWidthCell = styled.View`
  width: 100%;
`;

const ModuleCard = styled(Pressable)`
  flex: 1;
  padding: ${theme.spacing.md}px;
  border-bottom-width: 1px;
  border-bottom-color: #2a2a2a;
`;

const AvisosCard = styled(ModuleCard)`
  background-color: rgba(245, 196, 0, 0.12);
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
          <Row>
            <FullWidthCell>
              <Link href={AVISOS_MODULE.href} asChild>
                <AvisosCard>
                  <SymbolView
                    name={AVISOS_MODULE.icon}
                    tintColor={theme.colors.primary}
                    size={28}
                  />
                  <ModuleTitle>{AVISOS_MODULE.title}</ModuleTitle>
                  <ModuleDescription>{AVISOS_MODULE.description}</ModuleDescription>
                </AvisosCard>
              </Link>
            </FullWidthCell>
          </Row>

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
