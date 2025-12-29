import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Home";
import EditorPage from "./EditorPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
