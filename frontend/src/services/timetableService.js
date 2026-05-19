import api from './api'

export const fetchTimetable = async (department, semester) => {
  const response = await api.get('/timetables', {
    params: { department, semester },
  })
  return response.data.data
}

export const saveTimetable = async (timetableData) => {
  const response = await api.post('/timetables', timetableData)
  return response.data.data
}
