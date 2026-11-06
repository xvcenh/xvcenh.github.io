# frozen_string_literal: true

source "https://rubygems.org"

gem "jekyll", "~> 4.3.0"
gem "minima", "~> 2.5"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-sitemap", "~> 1.4"
  gem "jekyll-paginate", "~> 1.1"
  gem "jekyll-seo-tag", "~> 2.6"
end

platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
end

# 注意：这里原本还有 gem "wdm"，那是 Jekyll 3 时代在 Windows 上做文件监听的依赖。
# Jekyll 4 起改用 listen，wdm 已无用，且在 Ruby 3.x 上无法编译（C 扩展过时），
# 会让 Windows 本地 bundle install 直接失败。CI 跑在 Linux 上本来就跳过它。
gem "webrick", "~> 1.7"