import { ImageKind } from './models';

/** Restrições/origens que um prato pode conter. */
export type Flag =
  | 'lactose'
  | 'dairy'
  | 'gluten'
  | 'peanut'
  | 'nuts'
  | 'seafood'
  | 'egg'
  | 'soy'
  | 'meat'
  | 'fish'
  | 'honey';

export type Tag =
  | 'brazilian'
  | 'chicken'
  | 'fish'
  | 'rice-beans'
  | 'fruit'
  | 'pasta'
  | 'vegetables'
  | 'savory';

export type Pool = 'breakfast' | 'snack' | 'main';

export interface FoodOption {
  id: string;
  pool: Pool;
  /** Descrição do prato, como aparece no plano. */
  name: string;
  ingredients: string[];
  /** Macros da porção base, em gramas. As calorias são derivadas. */
  protein: number;
  carbs: number;
  fat: number;
  prepMin: number;
  /** 1 = econômico, 2 = intermediário, 3 = premium. */
  cost: 1 | 2 | 3;
  flags: Flag[];
  tags: Tag[];
  /** Pode ser levado em marmita. */
  portable: boolean;
  image: ImageKind;
}

export const optionKcal = (o: Pick<FoodOption, 'protein' | 'carbs' | 'fat'>): number =>
  Math.round(o.protein * 4 + o.carbs * 4 + o.fat * 9);

interface Extras {
  prep: number;
  cost: 1 | 2 | 3;
  flags?: Flag[];
  tags?: Tag[];
  portable?: boolean;
  image?: ImageKind;
}

const food = (
  pool: Pool,
  id: string,
  name: string,
  ingredients: string[],
  protein: number,
  carbs: number,
  fat: number,
  x: Extras,
): FoodOption => ({
  id,
  pool,
  name,
  ingredients,
  protein,
  carbs,
  fat,
  prepMin: x.prep,
  cost: x.cost,
  flags: x.flags ?? [],
  tags: x.tags ?? [],
  portable: x.portable ?? true,
  image: x.image ?? (pool === 'main' ? 'food' : 'salad'),
});

/**
 * Catálogo de pratos. Valores nutricionais são estimativas por porção base
 * (aproximação de tabelas como TACO), usadas para escalar a porção até a meta calórica.
 */
export const FOOD_CATALOG: FoodOption[] = [
  // ───────────── Café da manhã ─────────────
  food('breakfast', 'omelete-pao', 'Omelete de 2 ovos com tomate, pão integral e mamão', ['ovo', 'tomate', 'pão integral', 'mamão'], 22, 42, 16, { prep: 15, cost: 1, flags: ['egg', 'gluten'], tags: ['brazilian', 'savory', 'fruit'] }),
  food('breakfast', 'tapioca-queijo', 'Tapioca com queijo minas e tomate', ['tapioca', 'queijo minas', 'tomate'], 16, 40, 12, { prep: 10, cost: 1, flags: ['lactose', 'dairy'], tags: ['brazilian', 'savory'] }),
  food('breakfast', 'iogurte-aveia', 'Iogurte natural com aveia, banana e mel', ['iogurte natural', 'aveia', 'banana', 'mel'], 18, 52, 8, { prep: 5, cost: 1, flags: ['lactose', 'dairy', 'gluten', 'honey'], tags: ['fruit'] }),
  food('breakfast', 'pao-pasta-amendoim', 'Pão integral com pasta de amendoim e banana', ['pão integral', 'pasta de amendoim', 'banana'], 14, 55, 16, { prep: 5, cost: 1, flags: ['gluten', 'peanut'], tags: ['fruit'] }),
  food('breakfast', 'tapioca-coco', 'Tapioca com coco e banana', ['tapioca', 'coco ralado', 'banana'], 4, 58, 8, { prep: 10, cost: 1, tags: ['brazilian', 'fruit'] }),
  food('breakfast', 'chia-coco', 'Pudim de chia com leite de coco e frutas vermelhas', ['chia', 'leite de coco', 'frutas vermelhas'], 8, 30, 18, { prep: 5, cost: 2, tags: ['fruit'] }),
  food('breakfast', 'cuscuz-abacate', 'Cuscuz de milho com abacate e tomate', ['cuscuz de milho', 'abacate', 'tomate'], 8, 55, 14, { prep: 15, cost: 1, tags: ['brazilian', 'savory', 'vegetables'] }),
  food('breakfast', 'mamao-chia-aveia', 'Mamão com chia e aveia', ['mamão', 'chia', 'aveia'], 9, 52, 9, { prep: 5, cost: 1, flags: ['gluten'], tags: ['brazilian', 'fruit'] }),
  food('breakfast', 'pao-tofu', 'Pão integral com tofu mexido e tomate', ['pão integral', 'tofu', 'tomate'], 22, 40, 14, { prep: 15, cost: 2, flags: ['gluten', 'soy'], tags: ['savory'] }),
  food('breakfast', 'pao-cottage', 'Pão integral com queijo cottage e morangos', ['pão integral', 'queijo cottage', 'morango'], 20, 44, 6, { prep: 5, cost: 2, flags: ['gluten', 'lactose', 'dairy'], tags: ['fruit'] }),
  food('breakfast', 'panqueca-banana', 'Panqueca de banana com ovo, aveia e canela', ['banana', 'ovo', 'aveia', 'canela'], 16, 48, 10, { prep: 15, cost: 1, flags: ['egg', 'gluten'], tags: ['fruit'] }),
  food('breakfast', 'mingau-aveia', 'Mingau de aveia com leite e canela', ['aveia', 'leite', 'canela'], 14, 50, 8, { prep: 10, cost: 1, flags: ['gluten', 'lactose', 'dairy'], tags: [] }),
  food('breakfast', 'mingau-vegetal', 'Mingau de aveia com bebida vegetal e frutas', ['aveia', 'bebida vegetal', 'frutas'], 10, 52, 8, { prep: 10, cost: 2, flags: ['gluten'], tags: ['fruit'] }),

  // ───────────── Lanches e ceia ─────────────
  food('snack', 'banana-amendoim', 'Banana com pasta de amendoim e canela', ['banana', 'pasta de amendoim', 'canela'], 6, 30, 9, { prep: 2, cost: 1, flags: ['peanut'], tags: ['fruit'], image: 'food' }),
  food('snack', 'iogurte-morango', 'Iogurte sem lactose com morangos e aveia', ['iogurte sem lactose', 'morango', 'aveia'], 10, 26, 4, { prep: 3, cost: 2, flags: ['dairy', 'gluten'], tags: ['fruit'] }),
  food('snack', 'iogurte-natural-fruta', 'Iogurte natural com frutas', ['iogurte natural', 'frutas'], 9, 22, 4, { prep: 3, cost: 1, flags: ['lactose', 'dairy'], tags: ['fruit'] }),
  food('snack', 'castanhas-maca', 'Mix de castanhas e uma maçã', ['castanhas', 'maçã'], 6, 26, 14, { prep: 1, cost: 3, flags: ['nuts'], tags: ['fruit'] }),
  food('snack', 'fruta-canela', 'Maçã ou pera com canela', ['maçã', 'pera', 'canela'], 1, 25, 0, { prep: 1, cost: 1, tags: ['fruit'] }),
  food('snack', 'pao-queijo-branco', 'Pão integral com queijo branco', ['pão integral', 'queijo branco'], 12, 24, 8, { prep: 3, cost: 1, flags: ['gluten', 'lactose', 'dairy'], tags: ['brazilian'] }),
  food('snack', 'ovos-fruta', '2 ovos cozidos e uma fruta', ['ovo', 'fruta'], 14, 18, 10, { prep: 10, cost: 1, flags: ['egg'], tags: ['fruit'] }),
  food('snack', 'pipoca', 'Pipoca de panela com azeite', ['milho de pipoca', 'azeite'], 4, 28, 6, { prep: 8, cost: 1, tags: [], image: 'food' }),
  food('snack', 'homus-cenoura', 'Homus com palitos de cenoura e pepino', ['grão-de-bico', 'cenoura', 'pepino', 'tahine'], 7, 22, 10, { prep: 10, cost: 2, tags: ['vegetables'] }),
  food('snack', 'banana-assada', 'Banana assada com canela', ['banana', 'canela'], 1, 27, 1, { prep: 8, cost: 1, tags: ['brazilian', 'fruit'] }),
  food('snack', 'shake-proteico', 'Shake de proteína com banana', ['whey protein', 'banana', 'água'], 25, 27, 3, { prep: 3, cost: 3, flags: ['lactose', 'dairy'], tags: ['fruit'], image: 'food' }),
  food('snack', 'abacate-limao', 'Abacate com limão', ['abacate', 'limão'], 2, 9, 15, { prep: 3, cost: 2, tags: ['brazilian', 'fruit'] }),
  food('snack', 'salada-frutas-chia', 'Salada de frutas com chia', ['frutas', 'chia'], 3, 30, 3, { prep: 8, cost: 1, tags: ['fruit'] }),

  // ───────────── Almoço e jantar ─────────────
  food('main', 'frango-arroz-feijao', 'Frango grelhado, arroz integral, feijão, abóbora assada e folhas', ['frango', 'arroz integral', 'feijão', 'abóbora', 'folhas'], 42, 62, 14, { prep: 30, cost: 1, flags: ['meat'], tags: ['brazilian', 'chicken', 'rice-beans', 'vegetables'] }),
  food('main', 'tilapia-batata', 'Tilápia assada com batata, brócolis e molho de limão', ['tilápia', 'batata', 'brócolis', 'limão'], 38, 45, 12, { prep: 30, cost: 2, flags: ['fish'], tags: ['fish', 'vegetables'] }),
  food('main', 'carne-arroz-feijao', 'Carne moída refogada com arroz, feijão e couve', ['carne moída', 'arroz', 'feijão', 'couve'], 38, 60, 18, { prep: 30, cost: 2, flags: ['meat'], tags: ['brazilian', 'rice-beans', 'vegetables'] }),
  food('main', 'macarrao-frango', 'Macarrão integral com frango desfiado e molho de tomate', ['macarrão integral', 'frango', 'tomate'], 36, 70, 12, { prep: 25, cost: 1, flags: ['meat', 'gluten'], tags: ['pasta', 'chicken'] }),
  food('main', 'omelete-legumes', 'Omelete de legumes com arroz e salada', ['ovo', 'legumes', 'arroz', 'salada'], 26, 52, 18, { prep: 20, cost: 1, flags: ['egg'], tags: ['vegetables'] }),
  food('main', 'lentilha-arroz', 'Lentilha com arroz integral, couve refogada e cenoura', ['lentilha', 'arroz integral', 'couve', 'cenoura'], 22, 78, 9, { prep: 35, cost: 1, tags: ['brazilian', 'vegetables'] }),
  food('main', 'arroz-feijao-ovo', 'Arroz, feijão, ovo mexido e salada de tomate', ['arroz', 'feijão', 'ovo', 'tomate'], 24, 70, 14, { prep: 20, cost: 1, flags: ['egg'], tags: ['brazilian', 'rice-beans', 'vegetables'] }),
  food('main', 'curry-grao-bico', 'Curry de grão-de-bico com arroz e espinafre', ['grão-de-bico', 'arroz', 'espinafre', 'leite de coco'], 20, 80, 14, { prep: 35, cost: 2, tags: ['vegetables'] }),
  food('main', 'tofu-arroz', 'Tofu grelhado com arroz, brócolis e cenoura', ['tofu', 'arroz', 'brócolis', 'cenoura'], 30, 62, 16, { prep: 25, cost: 2, flags: ['soy'], tags: ['vegetables'] }),
  food('main', 'frango-batata-doce', 'Frango com batata-doce e salada verde', ['frango', 'batata-doce', 'alface', 'rúcula'], 40, 52, 10, { prep: 30, cost: 1, flags: ['meat'], tags: ['chicken', 'vegetables'] }),
  food('main', 'salada-atum', 'Salada de atum com grão-de-bico, tomate e azeite', ['atum', 'grão-de-bico', 'tomate', 'azeite'], 36, 40, 18, { prep: 15, cost: 2, flags: ['fish'], tags: ['fish', 'vegetables'] }),
  food('main', 'quinoa-legumes', 'Quinoa com legumes assados e grão-de-bico', ['quinoa', 'legumes', 'grão-de-bico'], 20, 70, 14, { prep: 35, cost: 3, tags: ['vegetables'] }),
  food('main', 'bowl-feijao-preto', 'Bowl de arroz, feijão preto, abacate e milho', ['arroz', 'feijão preto', 'abacate', 'milho'], 18, 78, 16, { prep: 20, cost: 1, tags: ['brazilian', 'rice-beans', 'vegetables'] }),
  food('main', 'camarao-arroz', 'Camarão salteado com arroz e legumes', ['camarão', 'arroz', 'legumes'], 34, 58, 10, { prep: 25, cost: 3, flags: ['seafood'], tags: ['vegetables'] }),
  food('main', 'wrap-frango', 'Wrap integral de frango com salada e iogurte', ['wrap integral', 'frango', 'salada', 'iogurte'], 34, 46, 12, { prep: 15, cost: 2, flags: ['meat', 'gluten', 'lactose', 'dairy'], tags: ['chicken', 'vegetables'] }),
  food('main', 'sopa-frango', 'Sopa de legumes com frango desfiado', ['frango', 'cenoura', 'batata', 'chuchu'], 34, 45, 9, { prep: 35, cost: 1, flags: ['meat'], tags: ['chicken', 'vegetables'], portable: false }),
  food('main', 'polenta-cogumelos', 'Polenta cremosa com cogumelos e salada', ['polenta', 'cogumelos', 'salada'], 14, 68, 12, { prep: 30, cost: 2, tags: ['vegetables'] }),
  food('main', 'peixe-arroz-feijao', 'Peixe assado com arroz, feijão e legumes', ['peixe', 'arroz', 'feijão', 'legumes'], 38, 60, 10, { prep: 30, cost: 2, flags: ['fish'], tags: ['fish', 'brazilian', 'rice-beans', 'vegetables'] }),
  food('main', 'escondidinho-carne', 'Escondidinho de batata-doce com carne e salada', ['batata-doce', 'carne moída', 'salada'], 36, 58, 14, { prep: 40, cost: 2, flags: ['meat'], tags: ['brazilian', 'vegetables'] }),
];
