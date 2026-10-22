/**
 * Termo de busca (curto, focado na preparação principal) de cada prato do catálogo,
 * usado no link "mais receitas" do Tudo Gostoso. Buscar pelo nome completo do prato
 * retornaria poucos ou nenhum resultado.
 */
export const RECIPE_QUERY: Record<string, string> = {
  // Café da manhã
  'omelete-pao': 'omelete de tomate',
  'tapioca-queijo': 'tapioca com queijo',
  'iogurte-aveia': 'iogurte com aveia e banana',
  'pao-pasta-amendoim': 'pão integral com pasta de amendoim',
  'tapioca-coco': 'tapioca com coco',
  'chia-coco': 'pudim de chia com leite de coco',
  'cuscuz-abacate': 'cuscuz de milho',
  'mamao-chia-aveia': 'mamão com aveia e chia',
  'pao-tofu': 'tofu mexido',
  'pao-cottage': 'pão com queijo cottage',
  'panqueca-banana': 'panqueca de banana com aveia',
  'mingau-aveia': 'mingau de aveia',
  'mingau-vegetal': 'mingau de aveia com leite vegetal',

  // Lanches e ceia
  'banana-amendoim': 'banana com pasta de amendoim',
  'iogurte-morango': 'iogurte com morango e aveia',
  'iogurte-natural-fruta': 'iogurte natural com frutas',
  'castanhas-maca': 'mix de castanhas',
  'fruta-canela': 'maçã com canela',
  'pao-queijo-branco': 'pão integral com queijo branco',
  'ovos-fruta': 'ovo cozido',
  pipoca: 'pipoca de panela',
  'homus-cenoura': 'homus',
  'banana-assada': 'banana assada com canela',
  'shake-proteico': 'shake de banana com proteína',
  'abacate-limao': 'abacate com limão',
  'salada-frutas-chia': 'salada de frutas com chia',

  // Almoço e jantar
  'frango-arroz-feijao': 'frango grelhado',
  'tilapia-batata': 'tilápia assada',
  'carne-arroz-feijao': 'carne moída refogada',
  'macarrao-frango': 'macarrão com frango desfiado',
  'omelete-legumes': 'omelete de legumes',
  'lentilha-arroz': 'lentilha com arroz',
  'arroz-feijao-ovo': 'ovo mexido',
  'curry-grao-bico': 'curry de grão-de-bico',
  'tofu-arroz': 'tofu grelhado',
  'frango-batata-doce': 'frango com batata doce',
  'salada-atum': 'salada de atum com grão de bico',
  'quinoa-legumes': 'quinoa com legumes',
  'bowl-feijao-preto': 'bowl de feijão preto',
  'camarao-arroz': 'camarão salteado',
  'wrap-frango': 'wrap de frango',
  'sopa-frango': 'sopa de legumes com frango',
  'polenta-cogumelos': 'polenta cremosa com cogumelos',
  'peixe-arroz-feijao': 'peixe assado',
  'escondidinho-carne': 'escondidinho de batata doce com carne',
};

const SEARCH_URL = 'https://www.tudogostoso.com.br/busca';

/** Link para os resultados do Tudo Gostoso; `null` para pratos sem receita (ex.: registrados por foto). */
export function recipeUrl(optionId: string): string | null {
  const query = RECIPE_QUERY[optionId];
  return query ? `${SEARCH_URL}?${new URLSearchParams({ q: query })}` : null;
}

export type Unit =
  | 'g'
  | 'ml'
  | 'un'
  | 'fatia'
  | 'colher de sopa'
  | 'colher de sobremesa'
  | 'colher de chá'
  | 'xícara'
  | 'concha'
  | 'dente'
  | 'folha';

/** `name` aceita "singular|plural" (usado quando a unidade é `un`). `qty` nulo = "a gosto". */
export interface RecipeItem {
  qty: number | null;
  unit: Unit;
  name: string;
}

export interface Recipe {
  /** Quantidades da porção base do prato; são multiplicadas pelo fator da refeição. */
  items: RecipeItem[];
  steps: string[];
  tip?: string;
}

type ItemTuple = [number | null, Unit, string];

const recipe = (items: ItemTuple[], steps: string[], tip?: string): Recipe => ({
  items: items.map(([qty, unit, name]) => ({ qty, unit, name })),
  steps,
  tip,
});

/**
 * Receitas do catálogo. As quantidades são aproximadas (porção base) e escalam com a
 * porção planejada. Usam apenas ingredientes coerentes com as restrições do prato.
 */
export const RECIPES: Record<string, Recipe> = {
  // ───────────── Café da manhã ─────────────
  'omelete-pao': recipe(
    [[2, 'un', 'ovo|ovos'], [1, 'un', 'tomate médio|tomates médios'], [1, 'colher de chá', 'azeite'], [2, 'fatia', 'pão integral'], [150, 'g', 'mamão'], [null, 'un', 'sal']],
    ['Bata os ovos com uma pitada de sal.', 'Pique o tomate e refogue por 1 minuto no azeite, em frigideira antiaderente.', 'Despeje os ovos, tampe e cozinhe em fogo baixo até firmar, cerca de 3 minutos. Dobre ao meio.', 'Sirva com o pão e o mamão em cubos.'],
    'Salsinha ou orégano picados deixam a omelete mais aromática.',
  ),
  'tapioca-queijo': recipe(
    [[45, 'g', 'goma de tapioca'], [60, 'g', 'queijo minas frescal'], [0.5, 'un', 'tomate médio|tomates médios']],
    ['Aqueça uma frigideira antiaderente em fogo médio, sem óleo.', 'Peneire a goma sobre a frigideira, formando um disco fino e uniforme.', 'Quando a goma firmar e soltar do fundo (cerca de 1 minuto), vire se quiser.', 'Recheie com o queijo em fatias e o tomate picado, dobre e sirva quente.'],
  ),
  'iogurte-aveia': recipe(
    [[150, 'g', 'iogurte natural'], [30, 'g', 'aveia em flocos'], [1, 'un', 'banana|bananas'], [1, 'colher de chá', 'mel']],
    ['Coloque o iogurte em uma tigela.', 'Fatie a banana e distribua por cima.', 'Finalize com a aveia e fio de mel.'],
    'Para uma textura mais macia, deixe a aveia hidratar no iogurte por 5 minutos.',
  ),
  'pao-pasta-amendoim': recipe(
    [[2, 'fatia', 'pão integral'], [2, 'colher de sopa', 'pasta de amendoim'], [1, 'un', 'banana|bananas']],
    ['Torre levemente o pão, se preferir.', 'Espalhe a pasta de amendoim sobre as fatias.', 'Cubra com a banana fatiada e sirva.'],
  ),
  'tapioca-coco': recipe(
    [[50, 'g', 'goma de tapioca'], [1, 'colher de sopa', 'coco ralado'], [1, 'un', 'banana|bananas']],
    ['Aqueça uma frigideira antiaderente em fogo médio.', 'Peneire a goma formando um disco e deixe firmar por cerca de 1 minuto.', 'Distribua o coco ralado e a banana fatiada, dobre e sirva.'],
  ),
  'chia-coco': recipe(
    [[40, 'g', 'chia'], [100, 'ml', 'leite de coco light'], [80, 'g', 'frutas vermelhas']],
    ['Misture a chia com o leite de coco em um pote.', 'Mexa de novo após 5 minutos, para não empelotar.', 'Leve à geladeira por pelo menos 2 horas (ou de um dia para o outro).', 'Sirva coberto com as frutas vermelhas.'],
    'Prepare à noite e acorde com o café da manhã pronto.',
  ),
  'cuscuz-abacate': recipe(
    [[50, 'g', 'flocão de milho'], [60, 'ml', 'água'], [100, 'g', 'abacate'], [1, 'un', 'tomate médio|tomates médios'], [null, 'un', 'sal']],
    ['Misture o flocão com a água e uma pitada de sal; deixe hidratar por 5 minutos.', 'Cozinhe no vapor (cuscuzeira) por cerca de 10 minutos.', 'Amasse o abacate com um pouco de sal e pique o tomate.', 'Sirva o cuscuz com o abacate e o tomate por cima.'],
  ),
  'mamao-chia-aveia': recipe(
    [[250, 'g', 'mamão'], [2, 'colher de sopa', 'chia'], [3, 'colher de sopa', 'aveia em flocos']],
    ['Corte o mamão em cubos e coloque em uma tigela.', 'Polvilhe a chia e a aveia.', 'Misture e sirva em seguida.'],
  ),
  'pao-tofu': recipe(
    [[120, 'g', 'tofu firme'], [1, 'un', 'tomate médio|tomates médios'], [1, 'colher de chá', 'azeite'], [2, 'fatia', 'pão integral'], [null, 'un', 'cúrcuma e sal']],
    ['Amasse o tofu com um garfo.', 'Refogue o tomate picado no azeite por 1 minuto.', 'Junte o tofu, a cúrcuma e o sal; mexa por 4 a 5 minutos, até ficar firme e dourado.', 'Sirva sobre o pão, torrado se preferir.'],
    'A cúrcuma dá cor de ovo mexido ao tofu.',
  ),
  'pao-cottage': recipe(
    [[2, 'fatia', 'pão integral'], [120, 'g', 'queijo cottage'], [150, 'g', 'morango']],
    ['Torre levemente o pão.', 'Espalhe o queijo cottage sobre as fatias.', 'Cubra com os morangos fatiados e sirva.'],
  ),
  'panqueca-banana': recipe(
    [[1, 'un', 'banana|bananas'], [1, 'un', 'ovo|ovos'], [3, 'colher de sopa', 'aveia em flocos'], [1, 'colher de chá', 'azeite'], [null, 'un', 'canela']],
    ['Amasse bem a banana e misture com o ovo, a aveia e a canela até formar uma massa.', 'Aqueça uma frigideira antiaderente com o azeite em fogo baixo.', 'Coloque porções da massa e doure 2 a 3 minutos de cada lado.', 'Sirva com canela por cima.'],
    'Quanto mais madura a banana, mais doce a panqueca.',
  ),
  'mingau-aveia': recipe(
    [[50, 'g', 'aveia em flocos'], [250, 'ml', 'leite semidesnatado'], [null, 'un', 'canela']],
    ['Leve a aveia e o leite a uma panela em fogo médio.', 'Mexa por 4 a 5 minutos, até engrossar.', 'Sirva morno com canela por cima.'],
  ),
  'mingau-vegetal': recipe(
    [[40, 'g', 'aveia em flocos'], [250, 'ml', 'bebida vegetal sem açúcar (por exemplo, de aveia)'], [100, 'g', 'frutas picadas']],
    ['Leve a aveia e a bebida vegetal a uma panela em fogo médio.', 'Mexa por 4 a 5 minutos, até engrossar.', 'Sirva coberto com as frutas picadas.'],
  ),

  // ───────────── Lanches e ceia ─────────────
  'banana-amendoim': recipe(
    [[1, 'un', 'banana|bananas'], [1, 'colher de sopa', 'pasta de amendoim'], [null, 'un', 'canela']],
    ['Corte a banana em rodelas ou ao meio, no comprimento.', 'Cubra com a pasta de amendoim e polvilhe canela.'],
  ),
  'iogurte-morango': recipe(
    [[170, 'g', 'iogurte sem lactose'], [100, 'g', 'morango'], [2, 'colher de sopa', 'aveia em flocos']],
    ['Fatie os morangos.', 'Coloque o iogurte em uma tigela e cubra com os morangos.', 'Finalize com a aveia.'],
  ),
  'iogurte-natural-fruta': recipe(
    [[170, 'g', 'iogurte natural'], [100, 'g', 'frutas picadas']],
    ['Pique as frutas de sua preferência.', 'Misture ao iogurte ou use como cobertura.'],
  ),
  'castanhas-maca': recipe(
    [[25, 'g', 'mix de castanhas'], [1, 'un', 'maçã|maçãs']],
    ['Separe o mix de castanhas na porção indicada.', 'Lave a maçã e sirva junto, em fatias se preferir.'],
    'Meça as castanhas: são muito calóricas e é fácil exagerar.',
  ),
  'fruta-canela': recipe(
    [[1, 'un', 'maçã ou pera grande|maçãs ou peras grandes'], [null, 'un', 'canela']],
    ['Lave a fruta e corte em fatias.', 'Polvilhe canela e sirva.'],
    'Aquecida 1 minuto no micro-ondas fica parecendo uma sobremesa.',
  ),
  'pao-queijo-branco': recipe(
    [[2, 'fatia', 'pão integral'], [40, 'g', 'queijo branco']],
    ['Corte o queijo em fatias finas.', 'Monte o sanduíche e, se quiser, toste na frigideira por 1 minuto de cada lado.'],
  ),
  'ovos-fruta': recipe(
    [[2, 'un', 'ovo|ovos'], [1, 'un', 'fruta de sua preferência|frutas de sua preferência']],
    ['Cozinhe os ovos em água fervente por 8 a 10 minutos.', 'Esfrie em água corrente, descasque e sirva com a fruta.'],
    'Cozinhe vários de uma vez: duram até 5 dias na geladeira, com casca.',
  ),
  pipoca: recipe(
    [[35, 'g', 'milho de pipoca'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal']],
    ['Em uma panela grande com tampa, aqueça o azeite em fogo médio.', 'Junte o milho, tampe e agite a panela de vez em quando.', 'Quando os estouros diminuírem, desligue, tempere com sal e sirva.'],
  ),
  'homus-cenoura': recipe(
    [[60, 'g', 'grão-de-bico cozido'], [1, 'colher de sopa', 'tahine'], [0.5, 'un', 'limão|limões'], [1, 'dente', 'alho'], [1, 'un', 'cenoura|cenouras'], [0.5, 'un', 'pepino']],
    ['Bata no liquidificador o grão-de-bico, o tahine, o suco do limão, o alho e um pouco de água até ficar cremoso.', 'Corte a cenoura e o pepino em palitos.', 'Sirva o homus com os palitos para mergulhar.'],
  ),
  'banana-assada': recipe(
    [[1, 'un', 'banana|bananas'], [null, 'un', 'canela']],
    ['Corte a banana ao meio, no comprimento, sem descascar ou descascada.', 'Leve ao forno a 200 °C (ou frigideira) por 8 a 10 minutos.', 'Polvilhe canela e sirva morna.'],
  ),
  'shake-proteico': recipe(
    [[30, 'g', 'whey protein'], [1, 'un', 'banana|bananas'], [200, 'ml', 'água gelada']],
    ['Coloque todos os ingredientes no liquidificador.', 'Bata por 1 minuto e sirva imediatamente.'],
  ),
  'abacate-limao': recipe(
    [[100, 'g', 'abacate'], [0.5, 'un', 'limão|limões']],
    ['Corte o abacate em cubos ou fatias.', 'Esprema o limão por cima, para não escurecer, e sirva.'],
  ),
  'salada-frutas-chia': recipe(
    [[200, 'g', 'frutas variadas'], [1, 'colher de sopa', 'chia']],
    ['Corte as frutas em cubos.', 'Misture e polvilhe a chia por cima.'],
  ),

  // ───────────── Almoço e jantar ─────────────
  'frango-arroz-feijao': recipe(
    [[130, 'g', 'filé de frango'], [150, 'g', 'arroz integral cozido'], [80, 'g', 'feijão cozido'], [100, 'g', 'abóbora'], [60, 'g', 'folhas verdes'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal, alho e limão']],
    ['Tempere o frango com sal, alho e limão por 10 minutos.', 'Grelhe em frigideira antiaderente por 5 a 6 minutos de cada lado, até dourar e cozinhar por dentro.', 'Corte a abóbora em cubos, regue com o azeite e asse a 200 °C por 20 minutos.', 'Monte o prato com o arroz, o feijão, o frango, a abóbora e as folhas.'],
    'Para a marmita, deixe esfriar antes de fechar o pote.',
  ),
  'tilapia-batata': recipe(
    [[200, 'g', 'filé de tilápia'], [200, 'g', 'batata'], [100, 'g', 'brócolis'], [1, 'un', 'limão|limões'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal e pimenta']],
    ['Tempere a tilápia com sal, pimenta e o suco de ½ limão.', 'Corte a batata em cubos e cozinhe até ficar macia, cerca de 15 minutos.', 'Asse o peixe em forno a 200 °C por 15 a 18 minutos, regado com o azeite.', 'Cozinhe o brócolis no vapor por 4 minutos e sirva tudo com limão.'],
  ),
  'carne-arroz-feijao': recipe(
    [[150, 'g', 'carne moída'], [150, 'g', 'arroz cozido'], [80, 'g', 'feijão cozido'], [80, 'g', 'couve'], [1, 'colher de chá', 'azeite'], [1, 'dente', 'alho'], [null, 'un', 'sal']],
    ['Refogue o alho no azeite e junte a carne moída, mexendo até secar e dourar (8 a 10 minutos).', 'Tempere com sal.', 'Corte a couve bem fina e refogue por 2 minutos.', 'Sirva a carne com o arroz, o feijão e a couve.'],
  ),
  'macarrao-frango': recipe(
    [[80, 'g', 'macarrão integral (cru)'], [120, 'g', 'frango cozido e desfiado'], [100, 'g', 'molho de tomate'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal e manjericão']],
    ['Cozinhe o macarrão em água com sal, conforme a embalagem.', 'Aqueça o azeite, junte o molho de tomate e o frango desfiado por 3 minutos.', 'Misture o macarrão escorrido ao molho.', 'Finalize com manjericão.'],
  ),
  'omelete-legumes': recipe(
    [[3, 'un', 'ovo|ovos'], [100, 'g', 'legumes picados (cenoura, abobrinha, pimentão)'], [100, 'g', 'arroz cozido'], [60, 'g', 'salada'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal']],
    ['Refogue os legumes no azeite por 3 a 4 minutos.', 'Bata os ovos com sal e despeje sobre os legumes.', 'Tampe e cozinhe em fogo baixo até firmar, cerca de 4 minutos.', 'Sirva com o arroz e a salada.'],
  ),
  'lentilha-arroz': recipe(
    [[200, 'g', 'lentilha cozida'], [120, 'g', 'arroz integral cozido'], [80, 'g', 'couve'], [1, 'un', 'cenoura|cenouras'], [1, 'colher de chá', 'azeite'], [1, 'dente', 'alho'], [null, 'un', 'sal']],
    ['Refogue o alho no azeite e junte a cenoura ralada por 2 minutos.', 'Acrescente a lentilha cozida e um pouco da água do cozimento; ajuste o sal.', 'Refogue a couve fatiada fina por 2 minutos.', 'Sirva a lentilha com o arroz e a couve.'],
    'Cozinhe a lentilha em dobro e congele em porções.',
  ),
  'arroz-feijao-ovo': recipe(
    [[150, 'g', 'arroz cozido'], [100, 'g', 'feijão cozido'], [2, 'un', 'ovo|ovos'], [1, 'un', 'tomate médio|tomates médios'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal']],
    ['Bata os ovos com sal.', 'Aqueça o azeite e mexa os ovos em fogo baixo até o ponto desejado.', 'Corte o tomate em cubos e tempere com sal.', 'Monte o prato com o arroz, o feijão, o ovo mexido e a salada de tomate.'],
  ),
  'curry-grao-bico': recipe(
    [[180, 'g', 'grão-de-bico cozido'], [100, 'g', 'arroz cozido'], [60, 'g', 'espinafre'], [80, 'ml', 'leite de coco light'], [0.5, 'un', 'cebola'], [1, 'colher de chá', 'azeite'], [null, 'un', 'curry em pó e sal']],
    ['Refogue a cebola picada no azeite até dourar.', 'Junte o curry e mexa por 30 segundos.', 'Acrescente o grão-de-bico e o leite de coco; cozinhe por 8 minutos.', 'Desligue, misture o espinafre até murchar e sirva com o arroz.'],
  ),
  'tofu-arroz': recipe(
    [[180, 'g', 'tofu firme'], [150, 'g', 'arroz cozido'], [100, 'g', 'brócolis'], [50, 'g', 'cenoura'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal, alho e limão']],
    ['Corte o tofu em fatias e tempere com sal, alho e limão por 10 minutos.', 'Grelhe no azeite por 3 a 4 minutos de cada lado, até dourar.', 'Cozinhe o brócolis e a cenoura no vapor por 5 minutos.', 'Sirva com o arroz.'],
  ),
  'frango-batata-doce': recipe(
    [[130, 'g', 'filé de frango'], [200, 'g', 'batata-doce'], [60, 'g', 'alface e rúcula'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal, alho e limão']],
    ['Tempere o frango com sal, alho e limão.', 'Grelhe por 5 a 6 minutos de cada lado, até cozinhar por dentro.', 'Cozinhe a batata-doce com casca até ficar macia (cerca de 20 minutos).', 'Sirva com a salada regada com o azeite.'],
  ),
  'salada-atum': recipe(
    [[120, 'g', 'atum em lata, escorrido'], [120, 'g', 'grão-de-bico cozido'], [1, 'un', 'tomate médio|tomates médios'], [1, 'colher de sopa', 'azeite'], [null, 'un', 'limão, sal e salsinha']],
    ['Escorra bem o atum e o grão-de-bico.', 'Pique o tomate em cubos.', 'Misture tudo, tempere com azeite, limão, sal e salsinha.'],
    'Boa para marmita: leve o tempero separado e misture na hora.',
  ),
  'quinoa-legumes': recipe(
    [[150, 'g', 'quinoa cozida'], [200, 'g', 'legumes (abobrinha, cenoura, berinjela)'], [100, 'g', 'grão-de-bico cozido'], [2, 'colher de chá', 'azeite'], [null, 'un', 'sal e ervas']],
    ['Corte os legumes em cubos, regue com o azeite e tempere.', 'Asse a 200 °C por 25 minutos, mexendo na metade.', 'Junte o grão-de-bico nos últimos 5 minutos.', 'Misture com a quinoa e sirva.'],
    'Lave a quinoa antes de cozinhar para tirar o amargor.',
  ),
  'bowl-feijao-preto': recipe(
    [[180, 'g', 'arroz cozido'], [150, 'g', 'feijão preto cozido'], [80, 'g', 'abacate'], [50, 'g', 'milho cozido'], [0.5, 'un', 'tomate médio|tomates médios'], [null, 'un', 'limão, coentro e sal']],
    ['Aqueça o arroz e o feijão preto.', 'Corte o abacate e o tomate em cubos e tempere com limão e sal.', 'Monte o bowl com o arroz, o feijão, o milho, o abacate e o tomate.'],
  ),
  'camarao-arroz': recipe(
    [[180, 'g', 'camarão limpo'], [150, 'g', 'arroz cozido'], [100, 'g', 'legumes picados'], [1, 'colher de chá', 'azeite'], [1, 'dente', 'alho'], [null, 'un', 'sal e limão']],
    ['Tempere o camarão com sal e limão.', 'Salteie o alho no azeite e junte o camarão por 2 a 3 minutos, até ficar rosado.', 'Retire e salteie os legumes por 3 minutos.', 'Junte tudo e sirva com o arroz.'],
    'Não cozinhe demais, para o camarão não ficar borrachudo.',
  ),
  'wrap-frango': recipe(
    [[1, 'un', 'wrap integral|wraps integrais'], [120, 'g', 'frango cozido e desfiado'], [3, 'colher de sopa', 'iogurte natural'], [50, 'g', 'folhas e tomate'], [null, 'un', 'sal e ervas']],
    ['Misture o frango desfiado com o iogurte, sal e ervas.', 'Aqueça o wrap por 20 segundos na frigideira.', 'Recheie com a mistura e as folhas, enrole e corte ao meio.'],
  ),
  'sopa-frango': recipe(
    [[120, 'g', 'peito de frango'], [150, 'g', 'batata'], [1, 'un', 'cenoura|cenouras'], [100, 'g', 'chuchu'], [1, 'colher de chá', 'azeite'], [400, 'ml', 'água'], [null, 'un', 'sal, alho e cebola']],
    ['Refogue a cebola e o alho no azeite em uma panela.', 'Junte o frango, a água e os legumes em cubos.', 'Cozinhe tampado por 20 a 25 minutos, até tudo ficar macio.', 'Retire o frango, desfie e volte à panela; ajuste o sal.'],
  ),
  'polenta-cogumelos': recipe(
    [[70, 'g', 'fubá'], [300, 'ml', 'água'], [150, 'g', 'cogumelos'], [1, 'colher de sopa', 'azeite'], [60, 'g', 'salada'], [null, 'un', 'sal e salsinha']],
    ['Ferva a água com sal e junte o fubá aos poucos, mexendo sempre.', 'Cozinhe em fogo baixo por 10 a 15 minutos, até ficar cremosa.', 'Salteie os cogumelos fatiados no azeite por 5 minutos.', 'Sirva a polenta com os cogumelos, a salsinha e a salada.'],
  ),
  'peixe-arroz-feijao': recipe(
    [[160, 'g', 'filé de peixe'], [150, 'g', 'arroz cozido'], [100, 'g', 'feijão cozido'], [100, 'g', 'legumes'], [1, 'colher de chá', 'azeite'], [null, 'un', 'sal e limão']],
    ['Tempere o peixe com sal e limão.', 'Asse a 200 °C por 15 a 18 minutos, regado com o azeite.', 'Cozinhe os legumes no vapor por 5 minutos.', 'Sirva com o arroz e o feijão.'],
  ),
  'escondidinho-carne': recipe(
    [[250, 'g', 'batata-doce'], [150, 'g', 'carne moída'], [0.5, 'un', 'cebola'], [1, 'dente', 'alho'], [1, 'colher de chá', 'azeite'], [60, 'g', 'salada'], [null, 'un', 'sal']],
    ['Cozinhe a batata-doce e amasse até virar um purê com sal.', 'Refogue a cebola e o alho no azeite; junte a carne e cozinhe até secar.', 'Em um refratário, faça uma camada de carne e cubra com o purê.', 'Leve ao forno a 200 °C por 15 minutos e sirva com a salada.'],
    'Monte em porções individuais e congele.',
  ),
};

const UNIT_PLURAL: Partial<Record<Unit, string>> = {
  fatia: 'fatias',
  'colher de sopa': 'colheres de sopa',
  'colher de sobremesa': 'colheres de sobremesa',
  'colher de chá': 'colheres de chá',
  xícara: 'xícaras',
  concha: 'conchas',
  dente: 'dentes',
  folha: 'folhas',
};

const pickName = (name: string, plural: boolean): string => {
  const [singular, pluralForm] = name.split('|');
  return plural && pluralForm ? pluralForm : singular;
};

const fraction = (v: number): string => {
  const whole = Math.floor(v);
  const half = v - whole >= 0.5;
  if (whole === 0) return '½';
  return half ? `${whole}½` : `${whole}`;
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Texto de um ingrediente já ajustado à porção (`factor` = porção planejada ÷ porção base). */
export function formatItem(item: RecipeItem, factor: number): string {
  if (item.qty === null) return capitalize(`${pickName(item.name, false)} a gosto`);

  const raw = item.qty * factor;
  if (item.unit === 'g' || item.unit === 'ml') {
    return `${Math.max(5, Math.round(raw / 5) * 5)} ${item.unit} de ${pickName(item.name, false)}`;
  }

  const v = Math.max(0.5, Math.round(raw * 2) / 2);
  const plural = v > 1;
  if (item.unit === 'un') return `${fraction(v)} ${pickName(item.name, plural)}`;
  const unit = plural ? (UNIT_PLURAL[item.unit] ?? item.unit) : item.unit;
  return `${fraction(v)} ${unit} de ${pickName(item.name, false)}`;
}

export function recipeFor(optionId: string): Recipe | null {
  return RECIPES[optionId] ?? null;
}
