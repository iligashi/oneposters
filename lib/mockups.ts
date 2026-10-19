export type Point = { x: number; y: number }
export type Scene = {
  id: string
  name: string
  image: string
  corners: [Point, Point, Point, Point]
  shadow: { blur: number; opacity: number; y: number }
  wallColor: string
}

const room = (id: string, name: string, image: string, wallColor: string, corners: Scene['corners']): Scene => ({ id, name, image, wallColor, corners, shadow: { blur: 22, opacity: 0.28, y: 18 } })

export const scenes: Scene[] = [
  room('living-room', 'Living room', 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=85', '#d9d0c0', [{ x: 32, y: 18 }, { x: 60, y: 16 }, { x: 60, y: 57 }, { x: 32, y: 60 }]),
  room('bedroom', 'Bedroom', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=85', '#cfc9bc', [{ x: 35, y: 12 }, { x: 62, y: 14 }, { x: 62, y: 54 }, { x: 35, y: 53 }]),
  room('office', 'Home office', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=85', '#dedbd1', [{ x: 38, y: 16 }, { x: 63, y: 16 }, { x: 63, y: 57 }, { x: 38, y: 57 }]),
  room('kitchen', 'Kitchen', 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=1400&q=85', '#e1ddd4', [{ x: 23, y: 12 }, { x: 48, y: 13 }, { x: 48, y: 54 }, { x: 23, y: 54 }]),
  room('hallway', 'Hallway', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85', '#d8d4ca', [{ x: 40, y: 10 }, { x: 64, y: 10 }, { x: 64, y: 57 }, { x: 40, y: 57 }]),
  room('cafe', 'Café', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1400&q=85', '#bcae9e', [{ x: 34, y: 13 }, { x: 57, y: 15 }, { x: 57, y: 56 }, { x: 34, y: 55 }]),
  room('kids-room', "Kid's room", 'https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=1400&q=85', '#ded4cc', [{ x: 29, y: 16 }, { x: 54, y: 15 }, { x: 54, y: 56 }, { x: 29, y: 56 }]),
  room('gallery', 'Gallery wall', 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=1400&q=85', '#eee9df', [{ x: 35, y: 11 }, { x: 59, y: 11 }, { x: 59, y: 53 }, { x: 35, y: 53 }]),
]
