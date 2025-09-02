// 스토어 임시 페이지
import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
    name: 'user',
    initialState: {
        username: null,
        role: null,
    },
    reducers: {
        setUser: (state, action) => {
            Object.assign(state, action.payload);
        },
        clearUser: (state) => {
            state.username = null;
            state.role = null;
        },
    },
});
export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;