# 🦍 Gorilla Warfare

A professional 3D action game built with Next.js, React Three Fiber, and TypeScript. Fight AI apes in an immersive jungle environment using exploding coconuts!

## 🎮 Game Features

- **Fortnite-style Controls**: Mouse capture with free look, WASD movement
- **3D Graphics**: Professional 3D environment with waterfalls, trees, and dynamic lighting
- **Combat System**: Throw exploding coconuts with realistic physics and trajectory
- **AI Enemies**: Smart apes that chase and attack the player
- **Wave Progression**: Increasing difficulty with more enemies each wave
- **Immersive Environment**: Beautiful jungle setting with ambient sounds and effects

## 🕹️ Controls

- **First Click**: Lock mouse to center of screen
- **Mouse Movement**: Look around freely (360° rotation)
- **WASD**: Move relative to camera direction
- **Left Click**: Shoot exploding coconuts
- **ESC**: Release mouse lock

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pashpashpash/gorilla-warfare.git
cd gorilla-warfare
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Built With

- **Next.js 14** - React framework
- **React Three Fiber** - 3D graphics library
- **Three.js** - 3D engine
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **@react-three/drei** - 3D helpers and components

## 🎯 Game Mechanics

### Combat
- Coconuts explode on impact with 5-unit blast radius
- Each explosion deals 50 damage to enemies
- Enemies have 100 HP and drop when defeated
- Score 100 points per enemy defeated

### AI Behavior
- Enemies spawn in circles around the player
- Smart pathfinding to chase the player
- Attack when within 1.5 units of player
- Different enemy types: Apes, Gorillas, Monkeys

### Progression
- Start with 10 coconuts, gain 5 more each wave
- Enemy count increases each wave (max 6)
- Health system with damage from enemy attacks
- Wave-based survival gameplay

## 🌟 Technical Highlights

- **Pointer Lock API**: Captures mouse for authentic FPS controls
- **Spherical Camera System**: Smooth 3D camera rotation with proper constraints
- **Physics Simulation**: Realistic projectile physics with gravity
- **Real-time Collision Detection**: Explosion damage calculations
- **Performance Optimized**: Efficient 3D rendering with React Three Fiber

## 📁 Project Structure

```
gorilla-warfare/
├── src/app/
│   ├── components/
│   │   ├── Game.tsx          # Main game component
│   │   ├── GameContext.tsx   # Game state management
│   │   └── GameUI.tsx        # UI components
│   ├── game/
│   │   └── page.tsx          # Game page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # App layout
│   └── page.tsx              # Home page
├── public/                   # Static assets
├── haiku/                    # Game content (haikus)
└── poems/                    # Additional content
```

## 🎨 Features in Detail

### Camera System
- Fortnite-style mouse look with infinite rotation
- Camera follows player position smoothly
- Proper vertical rotation constraints
- Character faces camera direction

### Environment
- Procedurally placed trees and vegetation
- Animated waterfall effects
- Dynamic sky and lighting
- Particle effects for explosions

### Audio & Effects
- Explosion particle effects
- Health bars for enemies
- Crosshair targeting system
- Smooth animations and transitions

## 🔧 Development

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Built with React Three Fiber and Three.js
- Inspired by classic 3D action games
- Special thanks to the open source community

---

**Ready to go bananas? Start the battle now!** 🦍💥🥥
