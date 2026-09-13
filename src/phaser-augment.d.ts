import 'phaser';

declare module 'phaser' {
  namespace Types.Core {
    interface GameConfig {
      resolution?: number;
    }
  }
}
