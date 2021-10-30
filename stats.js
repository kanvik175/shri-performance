const metrics = ['load', 'domContentLoad', 'firstInputDelay', 
      'catsLoad', 'jsonParse', 'catsDisplay'];

const getParamsItems = (data, paramName) => data.reduce((items, value) => {
  const itemName = value.additional[paramName];
  if (itemName && !items.includes(itemName)) {
    items.push(itemName);
  }
  return items;
}, [])

function quantile(arr, q) {
    const sorted = arr.sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;

    if (sorted[base + 1] !== undefined) {
        return Math.floor(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
    } else {
        return Math.floor(sorted[base]);
    }
};

function calcQuantiles(data) {
	let result = {};

	result.hits = data.length;
	result.p25 = quantile(data, 0.25);
	result.p50 = quantile(data, 0.5);
	result.p75 = quantile(data, 0.75);
	result.p95 = quantile(data, 0.95);

	return result;
}

function prepareData(result) {
	return result.data.map(item => {
		item.date = item.timestamp.split('T')[0];

		return item;
	});
}

function makeTable(data, page, metrics, func, ...params) {
   return metrics.reduce((table, metric) => {
    table[metric] = func(data, page, metric, ...params);
    return table;
  }, {});
}

function filterDataByDate(data, page, name, date) {
  return data
					.filter(item => item.page == page && item.name == name && item.date == date);
}

// добавить метрику за выбранный день
function addMetricByDate(data, page, name, date) {
	let sampleData = filterDataByDate(data, page, name, date).map(({ value }) => value);

  return calcQuantiles(sampleData);
}

// рассчитывает все метрики за день
function calcMetricsByDate(data, page, date) {
	console.log(`All metrics for ${date}:`);

  const table = makeTable(data, page, metrics, addMetricByDate, date)

	console.table(table);
};

function filterDataByPeriod(data, page, name, startDate, endDate) {
  return data.filter((item) => {
    if (item.page !== page || item.name !== name) {
      return false;
    }

    const dateTimestamp = new Date(item.date).getTime();
    const startDateTimestamp = new Date(startDate).getTime();
    const endDateTimestamp = new Date(endDate).getTime();

    return dateTimestamp >= startDateTimestamp 
      && dateTimestamp <= endDateTimestamp;
  });
}

// добавить метрику за период
function addMetricByPeriod(data, page, name, startDate, endDate) {
  const sampleData = filterDataByPeriod(data, page, name, startDate, endDate)
    .map(({ value }) => value);

  return calcQuantiles(sampleData);
}

// рассчитывает все метрики за период
function calcMetricsByPeriod(data, page, startDate, endDate) {
	console.log(`All metrics from ${startDate} till ${endDate}`);

  const table = makeTable(data, page, metrics, addMetricByPeriod, startDate, endDate)

  console.table(table);
}

function filterDataByParam(data, page, paramKey, paramValue) {
  return data.filter(({ additional }) => additional[paramKey] === paramValue);
}

// рассчитывает одну метрику по определенному параметру за период времени
function showSliceByParams(data, page, startDate, endDate, metric, sliceBy) {
  console.log(`Show metric ${metric} by ${sliceBy} from ${startDate} till ${endDate}`);

  const lists = {
    platform: ['touch', 'desktop'],
    browser: getParamsItems(data, 'browser'),
    os: getParamsItems(data, 'os')
  }

  const filteredData = filterDataByPeriod(data, page, metric, startDate, endDate);

  const table = lists[sliceBy].reduce((table, item) => {
    const filteredByParamData = filterDataByParam(filteredData, page, sliceBy, item)
      .map(({ value }) => value);

    if (filteredByParamData.length) {
      table[item] = calcQuantiles(filteredByParamData);
    }
    return table;
  }, {});

  console.table(table);
}

fetch('https://shri.yandex/hw/stat/data?counterId=D8F28E50-3339-11EC-9EDF-9F93090714B7')
  .then(res => res.json())
  .then(result => {
    let data = prepareData(result);

    const pageName = 'main';

    const currentDate = new Date().toISOString().split('T')[0];
    calcMetricsByDate(data, pageName, currentDate);

    const startDate = '2021-10-28';
    const endDate = '2021-10-30';

    calcMetricsByPeriod(data, pageName, startDate, endDate);

    const metric = 'catsLoad';
    showSliceByParams(data, pageName, startDate, endDate, metric, 'platform');
    showSliceByParams(data, pageName, startDate, endDate, metric, 'browser');
    showSliceByParams(data, pageName, startDate, endDate, metric, 'os');
  });
