import { createSlice } from "@reduxjs/toolkit"

const debugSlice = createSlice({
  name: "debug",
  initialState: {
    steps: [],
    status: "idle",
    finalCode: "",
    originalCode: "",
    totalIterations: 0,
    sessionId: null,
    review: null,
    queryHistory: []
  },
  reducers: {
    startDebug(state, action) {
      state.steps = []
      state.status = "running"
      state.finalCode = ""
      state.originalCode = action.payload
      state.totalIterations = 0
      state.sessionId = null
      state.review = null
      state.queryHistory = []
    },
    addStep(state, action) {
      state.steps.push(action.payload)
    },
    setReview(state, action) {
      state.review = action.payload
    },
    setDone(state, action) {
      state.status = action.payload.status
      state.finalCode = action.payload.final_code
      state.totalIterations = action.payload.total_iterations
      state.sessionId = action.payload.session_id
    },
    addQuery(state, action) {
      state.queryHistory.push(action.payload)
    },
    reset(state) {
      state.steps = []
      state.status = "idle"
      state.finalCode = ""
      state.originalCode = ""
      state.totalIterations = 0
      state.sessionId = null
      state.review = null
      state.queryHistory = []
    }
  }
})

export const { startDebug, addStep, setReview, setDone, addQuery, reset } = debugSlice.actions
export default debugSlice.reducer