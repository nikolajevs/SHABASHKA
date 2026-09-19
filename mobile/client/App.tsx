import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { clientApi } from "../shared/api";

export default function App() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    if (!title || !description || !address || !scheduledAt) return setMessage("Заполните все поля");
    try {
      await clientApi.createOrder({ title, description, address, scheduledAt });
      setTitle(""); setDescription(""); setAddress(""); setScheduledAt("");
      setMessage("Заказ отправлен");
    } catch { setMessage("Не удалось отправить заказ"); }
  }

  return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.brand}>Gigs</Text><Text style={styles.heading}>Создать заказ</Text>
    <TextInput style={styles.input} placeholder="Что нужно сделать?" value={title} onChangeText={setTitle} />
    <TextInput style={[styles.input, styles.multiline]} placeholder="Опишите задачу" value={description} onChangeText={setDescription} multiline />
    <TextInput style={styles.input} placeholder="Адрес" value={address} onChangeText={setAddress} />
    <TextInput style={styles.input} placeholder="Дата и время" value={scheduledAt} onChangeText={setScheduledAt} />
    <Pressable style={styles.button} onPress={submit}><Text style={styles.buttonText}>Разместить заказ</Text></Pressable>
    {!!message && <Text style={styles.message}>{message}</Text>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#f8faf5" }, container: { padding: 24, gap: 14 }, brand: { fontSize: 30, fontWeight: "800", color: "#314c2f" }, heading: { fontSize: 26, fontWeight: "700", marginBottom: 8 }, input: { backgroundColor: "#fff", borderColor: "#cad8c3", borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 }, multiline: { minHeight: 110, textAlignVertical: "top" }, button: { backgroundColor: "#caff38", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 6 }, buttonText: { fontSize: 16, fontWeight: "700" }, message: { color: "#53634b", marginTop: 4 } });
