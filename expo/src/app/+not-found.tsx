// どの画面にも当てはまらないURL(誤字など)を開いたときは、ホームへ案内する
import { Redirect } from "expo-router";

export default function NotFoundScreen() {
  return <Redirect href="/HomeScreen" />;
}
