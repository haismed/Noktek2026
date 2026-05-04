# **App Name**: Noktek - نُكتك

## Core Features:

- User Authentication: Secure user signup and login via email/password and Google, with dedicated '/login' and '/signup' pages. A 'تسجيل الخروج' button will dynamically appear after successful authentication.
- Firestore User Profiles: Automatically create and manage user documents ('uid', 'displayName', 'email', 'photoURL', 'points') in the 'users' collection upon registration and for authenticated users.
- Text Post Creation: Users can add new text-based posts, including 'text', 'authorId', 'authorName', 'authorPhotoURL', 'createdAt', 'likeCount', and 'commentCount', accessible via a prominent '+' button in the navigation.
- Real-time Post Feed: Display user-generated posts in the 'نبض العالم' (Global Pulse) section of the home page, offering instant, real-time updates using onSnapshot as new posts are added or modified.
- Post Interaction & Points System: Users can 'like' posts, incrementing the 'likeCount'. This action, along with post creation, contributes to a user's 'points' total (10 points per post, 1 point per like).
- Top Creators Leaderboard: A dedicated 'صُنّاع الأسبوع' (Creators of the Week) section will display the top 5 users ranked by their total accumulated points from posts and likes.
- AI Post Idea Generator Tool: An AI-powered tool available during post creation to help users brainstorm joke ideas or enhance their text posts with creative suggestions before publishing.

## Style Guidelines:

- Color scheme: Modern Dark Mode. The background color is a very dark, subtle purple-gray (#19141C). The primary interaction color is a vibrant purple (#A020F0), while the accent color for call-to-actions and highlights is a strong blue (#007BFF).
- The primary font for all text, including headlines and body, is 'Tajawal', chosen for its readability and comprehensive support for the Arabic script, complementing the RTL interface. Note: currently only Google Fonts are supported.
- Icons will be modern and minimalistic. Standard social interaction icons (like, comment), navigation icons for the bottom bar, and a distinct '+' icon for post creation will be utilized.
- The entire application adheres to a Right-to-Left (RTL) layout. Navigation is handled by a fixed bottom bar containing 5 main icons (الرئيسية, استكشاف, +, سينما, بروج). The Home page prominently features 'نبض العالم', 'المنشورات', and 'صُنّاع الأسبوع' sections.
- Subtle and fluid animations for page transitions and interactions (e.g., liking a post) will enhance user experience, along with visual feedback for real-time updates.