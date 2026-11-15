import {createContext, useContext} from 'react';

export type SceneTiming = {
  index: number;
  fpb: number; // frames per beat
  enter: number; // local frame where content starts
  duration: number;
};

export const SceneContext = createContext<SceneTiming>({
  index: 0,
  fpb: 15,
  enter: 0,
  duration: 90,
});

export const useScene = () => useContext(SceneContext);
