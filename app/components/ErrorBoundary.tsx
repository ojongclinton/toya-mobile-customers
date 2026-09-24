import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

/**
 * Filet de sécurité applicatif.
 *
 * En build release, une exception JS non rattrapée dans un rendu fait quitter
 * l'app (écran natif « Toya a quitté »). Ce composant intercepte ces erreurs et
 * affiche un écran de secours propre, avec un bouton « Réessayer ».
 *
 * Volontairement autonome : pas d'i18n ni de dépendances externes, pour rester
 * fiable même si l'erreur provient d'un de ces modules.
 */
class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Trace conservée pour le débogage (visible dans les logs natifs / Sentry).
    console.error("ErrorBoundary a intercepté une erreur :", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0d0521",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700", textAlign: "center" }}>
          Oups, une erreur est survenue
        </Text>
        <Text
          style={{
            color: "#cfc8e6",
            fontSize: 14,
            textAlign: "center",
            marginTop: 12,
            lineHeight: 20,
          }}
        >
          L'application a rencontré un problème inattendu. Tu peux réessayer sans la fermer.
        </Text>

        {__DEV__ && this.state.error != null && (
          <ScrollView
            style={{ maxHeight: 160, marginTop: 16, alignSelf: "stretch" }}
            contentContainerStyle={{ paddingHorizontal: 8 }}
          >
            <Text style={{ color: "#ff8a8a", fontSize: 12, fontFamily: "monospace" }}>
              {String(this.state.error?.message ?? this.state.error)}
            </Text>
          </ScrollView>
        )}

        <TouchableOpacity
          onPress={this.handleRetry}
          style={{
            marginTop: 24,
            backgroundColor: "#ffffff",
            paddingVertical: 12,
            paddingHorizontal: 32,
            borderRadius: 24,
          }}
        >
          <Text style={{ color: "#0d0521", fontSize: 16, fontWeight: "600" }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export default ErrorBoundary;
