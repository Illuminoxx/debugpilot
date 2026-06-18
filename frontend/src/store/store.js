import { configureStore } from "@reduxjs/toolkit"
import debugReducer from "./debugSlice"

export const store = configureStore({
  reducer: { debug: debugReducer }
})
