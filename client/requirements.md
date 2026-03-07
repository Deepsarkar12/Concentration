## Packages
react-youtube | Youtube player component for video playback
framer-motion | Smooth animations and page transitions
date-fns | Formatting dates for focus sessions and history
lucide-react | High quality icons
recharts | Beautiful charts for focus statistics

## Notes
- Uses standard JWT auth stored in localStorage ('token')
- Protected routes check for token and valid /api/auth/me response
- Video progress is synced to the server every 10 seconds during playback
- Custom dark theme with vibrant orange accents
- Requires the backend to parse the youtubeVideoId from the youtubeUrl during video creation
