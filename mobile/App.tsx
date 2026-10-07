import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fetchProducts, Product } from "./src/api";
import { API_URL, colors } from "./src/config";

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await fetchProducts());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brand}>Petzy</Text>
        <Text style={styles.tagline}>Everything your pet needs</Text>
      </View>

      {loading && products.length === 0 ? (
        <ActivityIndicator style={styles.center} size="large" color={colors.coral} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Can't reach the Petzy API</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Text style={styles.errorBody}>Trying: {API_URL}</Text>
          <Pressable style={styles.button} onPress={load}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]} />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.title}>{item.title}</Text>
                {item.price && <Text style={styles.price}>{item.price}</Text>}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.teal, paddingHorizontal: 20, paddingVertical: 18 },
  brand: { color: "#fff", fontSize: 24, fontWeight: "700" },
  tagline: { color: "#D9EFEC", fontSize: 13, marginTop: 2 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumb: { width: 84, height: 84 },
  thumbEmpty: { backgroundColor: "#F1EFE9" },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "600", color: colors.text },
  price: { fontSize: 14, color: colors.coral, fontWeight: "600", marginTop: 4 },
  errorTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6 },
  errorBody: { fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 4 },
  button: { backgroundColor: colors.coral, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 12 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
