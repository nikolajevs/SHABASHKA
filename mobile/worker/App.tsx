import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { workerApi } from "../shared/api";
import type { Order } from "../shared/types";

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("Загрузка заказов…");
  const load = () => workerApi.listAvailableOrders().then(setOrders).then(() => setMessage("")).catch(() => setMessage("Не удалось загрузить заказы"));
  useEffect(() => { load(); }, []);

  async function accept(id: string) {
    try { const order = await workerApi.acceptOrder(id); setOrders((current) => current.map((item) => item.id === id ? order : item)); }
    catch { setMessage("Не удалось принять заказ"); }
  }

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.brand}>Gigs Worker</Text><Text style={styles.heading}>Доступные заказы</Text>
    {!!message && <Text style={styles.message}>{message}</Text>}
    {orders.map((order) => <View style={styles.card} key={order.id}><Text style={styles.title}>{order.title}</Text><Text style={styles.description}>{order.description}</Text><Text style={styles.meta}>{order.address}</Text><Text style={styles.meta}>{order.scheduledAt}</Text><Pressable style={styles.button} onPress={() => accept(order.id)}><Text style={styles.buttonText}>Принять заказ</Text></Pressable></View>)}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#f8faf5" }, container: { padding: 24, gap: 14 }, brand: { fontSize: 26, fontWeight: "800", color: "#314c2f" }, heading: { fontSize: 26, fontWeight: "700" }, message: { color: "#53634b" }, card: { backgroundColor: "#fff", borderRadius: 14, padding: 18, gap: 8, borderWidth: 1, borderColor: "#dce6d7" }, title: { fontSize: 19, fontWeight: "700" }, description: { fontSize: 15, lineHeight: 21 }, meta: { color: "#5e6f5a" }, button: { backgroundColor: "#caff38", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 4 }, buttonText: { fontWeight: "700", fontSize: 15 } });
