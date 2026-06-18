"use server";

import {
  getRecipes as newGetRecipes,
  createRecipe as newCreateRecipe,
  saveRecipeData as newSaveRecipeData,
  addQualityReading as newAddQualityReading
} from "@/modules/process/adapters/actions/sop-actions";

export async function getRecipes() {
  return newGetRecipes();
}

export async function createRecipe(name: string, assetId?: string) {
  return newCreateRecipe(name, assetId);
}

export async function saveRecipeData(recipeId: string, machines: any[]) {
  return newSaveRecipeData(recipeId, machines);
}

export async function addQualityReading(recipeId: string, value: number) {
  return newAddQualityReading(recipeId, value);
}
