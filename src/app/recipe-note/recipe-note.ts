import { Component, ElementRef, afterNextRender, computed, input, output, viewChild } from '@angular/core';
import { fmtDec } from '../nutrisync/format';
import { PlannedMeal } from '../nutrisync/models';
import { formatItem, recipeFor, recipeUrl } from '../nutrisync/recipes';

/** "Bloco de notas" com a receita do prato, ajustada à porção planejada. */
@Component({
  selector: 'app-recipe-note',
  templateUrl: './recipe-note.html',
  host: { '(document:keydown.escape)': 'closed.emit()' },
})
export class RecipeNote {
  readonly meal = input.required<PlannedMeal>();
  readonly closed = output<void>();

  protected readonly fmtDec = fmtDec;
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeBtn');

  protected readonly recipe = computed(() => recipeFor(this.meal().optionId));
  protected readonly moreUrl = computed(() => recipeUrl(this.meal().optionId));
  protected readonly items = computed(() => {
    const factor = this.meal().factor;
    return (this.recipe()?.items ?? []).map((item) => formatItem(item, factor));
  });

  constructor() {
    afterNextRender(() => this.closeButton()?.nativeElement.focus());
  }
}
