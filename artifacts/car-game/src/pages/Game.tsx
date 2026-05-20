import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 800;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 70;
const LANE_WIDTH = CANVAS_WIDTH / 3;
const MAX_FUEL = 100;
const FUEL_DECREASE_RATE = 0.05;

type GameObject = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Enemy = GameObject & {
  speed: number;
  color: string;
};

type FuelCan = GameObject & {
  active: boolean;
};

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  // Mutable game state
  const state = useRef({
    player: { x: CANVAS_WIDTH / 2 - CAR_WIDTH / 2, y: CANVAS_HEIGHT - CAR_HEIGHT - 20, width: CAR_WIDTH, height: CAR_HEIGHT, speed: 5, fuel: MAX_FUEL },
    enemies: [] as Enemy[],
    fuels: [] as FuelCan[],
    roadOffset: 0,
    speedMultiplier: 1,
    distance: 0,
    keys: { left: false, right: false },
    lastEnemySpawn: 0,
    lastFuelSpawn: 0,
    animationId: 0,
  });

  const startGame = () => {
    state.current = {
      player: { x: CANVAS_WIDTH / 2 - CAR_WIDTH / 2, y: CANVAS_HEIGHT - CAR_HEIGHT - 20, width: CAR_WIDTH, height: CAR_HEIGHT, speed: 5, fuel: MAX_FUEL },
      enemies: [],
      fuels: [],
      roadOffset: 0,
      speedMultiplier: 1,
      distance: 0,
      keys: { left: false, right: false },
      lastEnemySpawn: 0,
      lastFuelSpawn: 0,
      animationId: 0,
    };
    setScore(0);
    setGameState("playing");
  };

  const drawRectWithNeon = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, neon: string) => {
    ctx.fillStyle = fill;
    ctx.shadowBlur = 15;
    ctx.shadowColor = neon;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
  };

  const drawCar = (ctx: CanvasRenderingContext2D, car: GameObject, color: string, neon: string, isPlayer: boolean) => {
    // Body
    drawRectWithNeon(ctx, car.x, car.y, car.width, car.height, color, neon);
    
    // Windshield
    ctx.fillStyle = "#111";
    ctx.fillRect(car.x + 5, car.y + 15, car.width - 10, 15);
    
    // Headlights
    if (isPlayer) {
      drawRectWithNeon(ctx, car.x + 2, car.y - 2, 8, 4, "#fff", "#fff");
      drawRectWithNeon(ctx, car.x + car.width - 10, car.y - 2, 8, 4, "#fff", "#fff");
      
      // Taillights
      drawRectWithNeon(ctx, car.x + 2, car.y + car.height - 2, 8, 4, "#f00", "#f00");
      drawRectWithNeon(ctx, car.x + car.width - 10, car.y + car.height - 2, 8, 4, "#f00", "#f00");
    } else {
      // Enemy headlights facing down
      drawRectWithNeon(ctx, car.x + 2, car.y + car.height - 2, 8, 4, "#fff", "#fff");
      drawRectWithNeon(ctx, car.x + car.width - 10, car.y + car.height - 2, 8, 4, "#fff", "#fff");
    }
  };

  const checkCollision = (rect1: GameObject, rect2: GameObject) => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = (timestamp: number) => {
      const s = state.current;
      
      // Update logic
      s.distance += 0.1 * s.speedMultiplier;
      s.speedMultiplier += 0.0005; // slowly increase speed
      
      // Player movement
      if (s.keys.left && s.player.x > 0) {
        s.player.x -= s.player.speed;
      }
      if (s.keys.right && s.player.x < CANVAS_WIDTH - s.player.width) {
        s.player.x += s.player.speed;
      }
      
      // Fuel decrease
      s.player.fuel -= FUEL_DECREASE_RATE;
      if (s.player.fuel <= 0) {
        gameOver();
        return;
      }

      // Scrolling road
      s.roadOffset = (s.roadOffset + 5 * s.speedMultiplier) % 60;

      // Spawn enemies
      if (timestamp - s.lastEnemySpawn > Math.max(500, 1500 - s.speedMultiplier * 200)) {
        const lane = Math.floor(Math.random() * 3);
        const colors = [
          { fill: "#222", neon: "#f0f" },
          { fill: "#222", neon: "#f00" },
          { fill: "#222", neon: "#fa0" }
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        s.enemies.push({
          x: lane * LANE_WIDTH + (LANE_WIDTH / 2 - CAR_WIDTH / 2),
          y: -CAR_HEIGHT,
          width: CAR_WIDTH,
          height: CAR_HEIGHT,
          speed: 3 + Math.random() * 2,
          color: randomColor.neon
        });
        s.lastEnemySpawn = timestamp;
      }

      // Spawn fuel
      if (timestamp - s.lastFuelSpawn > 3000 + Math.random() * 2000) {
        const lane = Math.floor(Math.random() * 3);
        s.fuels.push({
          x: lane * LANE_WIDTH + (LANE_WIDTH / 2 - 15),
          y: -30,
          width: 30,
          height: 30,
          active: true
        });
        s.lastFuelSpawn = timestamp;
      }

      // Update enemies
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const enemy = s.enemies[i];
        enemy.y += (enemy.speed + 2) * s.speedMultiplier;
        
        if (enemy.y > CANVAS_HEIGHT) {
          s.enemies.splice(i, 1);
        } else if (checkCollision(s.player, enemy)) {
          gameOver();
          return;
        }
      }

      // Update fuels
      for (let i = s.fuels.length - 1; i >= 0; i--) {
        const fuel = s.fuels[i];
        fuel.y += 4 * s.speedMultiplier;
        
        if (checkCollision(s.player, fuel) && fuel.active) {
          s.player.fuel = Math.min(MAX_FUEL, s.player.fuel + 30);
          s.fuels.splice(i, 1);
        } else if (fuel.y > CANVAS_HEIGHT) {
          s.fuels.splice(i, 1);
        }
      }

      // Draw
      // Clear
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw road markings
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 4;
      ctx.setLineDash([30, 30]);
      
      ctx.beginPath();
      ctx.moveTo(LANE_WIDTH, -60 + s.roadOffset);
      ctx.lineTo(LANE_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(LANE_WIDTH * 2, -60 + s.roadOffset);
      ctx.lineTo(LANE_WIDTH * 2, CANVAS_HEIGHT);
      ctx.stroke();
      
      ctx.setLineDash([]);

      // Draw Side glowing lines
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#0ff";
      ctx.strokeStyle = "#0ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, CANVAS_HEIGHT);
      ctx.moveTo(CANVAS_WIDTH, 0);
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Fuels
      s.fuels.forEach(fuel => {
        drawRectWithNeon(ctx, fuel.x, fuel.y, fuel.width, fuel.height, "#222", "#0f0");
        ctx.fillStyle = "#0f0";
        ctx.font = "12px monospace";
        ctx.fillText("F", fuel.x + 10, fuel.y + 20);
      });

      // Draw Enemies
      s.enemies.forEach(enemy => {
        drawCar(ctx, enemy, "#111", enemy.color, false);
      });

      // Draw Player
      drawCar(ctx, s.player, "#111", "#0ff", true);

      // Draw UI (Fuel)
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(10, 10, 120, 20);
      ctx.fillStyle = s.player.fuel > 20 ? "#0ff" : "#f00";
      ctx.fillRect(10, 10, (s.player.fuel / MAX_FUEL) * 120, 20);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(10, 10, 120, 20);
      
      // Update React score only occasionally to avoid React render lag
      if (Math.floor(s.distance) % 5 === 0) {
        setScore(Math.floor(s.distance));
      }

      s.animationId = requestAnimationFrame(gameLoop);
    };

    const gameOver = () => {
      cancelAnimationFrame(state.current.animationId);
      setGameState("gameover");
      setHighScore(prev => Math.max(prev, Math.floor(state.current.distance)));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") state.current.keys.left = true;
      if (e.key === "ArrowRight" || e.key === "d") state.current.keys.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") state.current.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d") state.current.keys.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    state.current.animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(state.current.animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="relative border border-primary/30 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.15)] bg-[#0a0a0f]" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: "100%", maxHeight: "80vh" }}>
        
        {/* SCORE DISPLAY OVERLAY */}
        {gameState === "playing" && (
          <div className="absolute top-4 right-4 text-primary font-mono text-xl font-bold shadow-black drop-shadow-md">
            DIST: {score}
          </div>
        )}

        {/* MENU OVERLAY */}
        {gameState === "menu" && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10 p-6 text-center">
            <h1 className="text-4xl font-black text-primary mb-2 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">NEON RUN</h1>
            <p className="text-muted-foreground mb-8">Weave traffic. Collect fuel. Survive.</p>
            <Button onClick={startGame} size="lg" className="w-48 text-lg hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all">
              PLAY
            </Button>
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center z-10 p-6 text-center">
            <h1 className="text-4xl font-black text-destructive mb-2 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">WRECKED</h1>
            <div className="space-y-2 mb-8 text-lg">
              <p className="text-foreground">Distance: <span className="text-primary font-mono">{score}</span></p>
              <p className="text-muted-foreground text-sm">Best: <span className="font-mono">{highScore}</span></p>
            </div>
            <Button onClick={startGame} size="lg" variant="default" className="w-48 text-lg hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all">
              TRY AGAIN
            </Button>
          </div>
        )}

        {/* CANVAS */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full object-cover"
        />
      </div>

      {/* MOBILE CONTROLS */}
      <div className="mt-8 flex gap-4 w-full max-w-[400px] px-4 md:hidden">
        <Button 
          variant="outline"
          className="flex-1 h-16 active:bg-primary/20 border-primary/50 text-primary"
          onPointerDown={() => state.current.keys.left = true}
          onPointerUp={() => state.current.keys.left = false}
          onPointerLeave={() => state.current.keys.left = false}
        >
          LEFT
        </Button>
        <Button 
          variant="outline"
          className="flex-1 h-16 active:bg-primary/20 border-primary/50 text-primary"
          onPointerDown={() => state.current.keys.right = true}
          onPointerUp={() => state.current.keys.right = false}
          onPointerLeave={() => state.current.keys.right = false}
        >
          RIGHT
        </Button>
      </div>
      
      <p className="mt-6 text-muted-foreground text-sm hidden md:block">
        Use A/D or Left/Right arrows to steer.
      </p>
    </div>
  );
}
