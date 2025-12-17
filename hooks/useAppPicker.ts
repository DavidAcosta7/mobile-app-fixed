import { useState } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

type SelectedApp = {
  packageName: string;
  appName: string;
};

export function useAppPicker() {
  const [selectedApp, setSelectedApp] = useState<SelectedApp | null>(null);

  const showBankApps = (resolve: (app: SelectedApp | null) => void) => {
    Alert.alert(
      'Apps Bancarias',
      'Selecciona tu app bancaria:',
      [
        {
          text: 'Bancolombia',
          onPress: () =>
            resolve({
              packageName: 'com.todo1.mobile',
              appName: 'Bancolombia',
            }),
        },
        {
          text: 'Nequi',
          onPress: () =>
            resolve({
              packageName: 'com.nequi.MobileApp',
              appName: 'Nequi',
            }),
        },
        {
          text: 'Daviplata',
          onPress: () =>
            resolve({
              packageName: 'com.daviplata.mobile',
              appName: 'Daviplata',
            }),
        },
        {
          text: 'BBVA',
          onPress: () =>
            resolve({
              packageName: 'com.bbva.colombia',
              appName: 'BBVA',
            }),
        },
        {
          text: 'Davivienda',
          onPress: () =>
            resolve({
              packageName: 'com.davivienda.movilapp',
              appName: 'Davivienda',
            }),
        },
        {
          text: 'Banco de Bogotá',
          onPress: () =>
            resolve({
              packageName: 'com.bancodebogota.bancamovil',
              appName: 'Banco de Bogotá',
            }),
        },
        {
          text: 'PSE',
          onPress: () =>
            resolve({
              packageName: 'co.pse.app.android',
              appName: 'PSE',
            }),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  };

  const pickApp = async (opts?: {
    promptPackageName?: (
      title: string,
      message: string,
      initialValue: string,
      onSave: (value: string) => void
    ) => void;
    initialPackageName?: string;
  }): Promise<SelectedApp | null> => {
    if (Platform.OS !== 'android') {
      Alert.alert('No disponible', 'Esta función solo está disponible en Android');
      return null;
    }

    return await new Promise((resolve) => {
      Alert.alert('Seleccionar Aplicación', 'Elige cómo quieres seleccionar la app:', [
        {
          text: 'Apps Bancarias',
          onPress: () => showBankApps(resolve),
        },
        {
          text: 'Escribir Package Name',
          onPress: () => {
            if (!opts?.promptPackageName) {
              Alert.alert(
                'No disponible',
                'Este proyecto requiere un prompt personalizado para escribir el package name.',
                [{ text: 'OK', onPress: () => resolve(null) }]
              );
              return;
            }

            opts.promptPackageName(
              'Package Name',
              'Ejemplo: com.bancolombia.app',
              opts.initialPackageName ?? '',
              (text) => {
                const value = (text || '').trim();
                if (value && value.includes('.')) {
                  const appName = value.split('.').pop() || value;
                  resolve({ packageName: value, appName });
                } else {
                  Alert.alert('Error', 'Package name inválido');
                  resolve(null);
                }
              }
            );
          },
        },
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      ]);
    });
  };

  const openApp = async (packageName: string) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Error', 'Solo disponible en Android');
      return false;
    }

    try {
      await IntentLauncher.openApplication(packageName);
      return true;
    } catch (error) {
      try {
        const canOpen = await Linking.canOpenURL(`package:${packageName}`);
        if (canOpen) {
          await Linking.openURL(`package:${packageName}`);
          return true;
        }
      } catch (e) {
        console.error('Error opening app:', e);
      }

      Alert.alert(
        'App no instalada',
        'La aplicación seleccionada no está instalada en tu teléfono.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return false;
    }
  };

  return {
    pickApp,
    openApp,
    selectedApp,
    setSelectedApp,
  };
}
