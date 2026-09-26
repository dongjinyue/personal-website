const CHINA_TIME_OFFSET_MS = 8 * 60 * 60 * 1000;
const CHINA_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError("新闻日期必须是 YYYY-MM-DD 格式。");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError("新闻日期无效。");
  }
  return { year, month, day };
}

function chinaMidnightToUtc(dateParts, dayOffset = 0) {
  // 日期选择器代表北京时间自然日；转成 UTC 时间后交给 timestamptz 比较。
  return new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day + dayOffset) - CHINA_TIME_OFFSET_MS).toISOString();
}

/** 将日期选择器的首尾日期转换为北京时间自然日对应的 UTC 范围。 */
export function getChinaNewsDateRange(startDate, endDate) {
  const startInclusive = startDate ? chinaMidnightToUtc(parseDateOnly(startDate)) : undefined;
  const endExclusive = endDate ? chinaMidnightToUtc(parseDateOnly(endDate), 1) : undefined;
  return { startInclusive, endExclusive };
}

/** 新闻时间固定按北京时间显示，避免服务器和访客设备时区不同造成误读。 */
export function formatNewsDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return CHINA_DATE_TIME_FORMATTER.format(date);
}
