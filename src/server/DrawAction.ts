type DrawAction = Clear | Draw | Fill
enum DrawActionName {
    Clear = "clear",
    Draw = "draw",
    Fill = "fill"
}
type Clear = {
    action: DrawActionName.Clear
}

type Draw = {
    action: DrawActionName.Draw,
    startX: number,
    endX: number,
    startY: number,
    endY: number,
    color: string
    lineWidth: number
}

type Fill = {
    action: DrawActionName.Fill
    x: number,
    y: number,
    color: string
}

export type { DrawAction };
export { DrawActionName };