---
layout: default
title: "Pontifex | Insights & Perspectives"
permalink: /pontifex.html
---

<section class="post-archive">
  <div class="container container--narrow">
    <header class="post-archive__header">
      <h1 class="post-archive__title">Pontifex</h1>
      <p class="post-archive__subtitle">Insights & Perspectives from YAJUR.ai</p>
      <p class="post-archive__tagline">Building Bridges not Silos</p>
    </header>

    <div class="post-archive__list">
      {% for post in site.posts %}
      <article class="post-archive__item">
        <div class="post-archive__meta">
          <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%B %d, %Y" }}</time>
        </div>
        <h2 class="post-archive__item-title">
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </h2>
        <p class="post-archive__excerpt">{{ post.excerpt | strip_html | truncate: 160 }}</p>
        <a href="{{ post.url | relative_url }}" class="post-archive__read-more">Read More &rarr;</a>
      </article>
      {% endfor %}
    </div>
  </div>
</section>

<style>
.post-archive {
  padding: 100px 0;
  background-color: #faf9f5;
  min-height: 60vh;
}

.post-archive__header {
  text-align: center;
  margin-bottom: 80px;
}

.post-archive__title {
  font-size: 3.5rem;
  font-weight: 800;
  color: #010101;
  margin-bottom: 10px;
}

.post-archive__subtitle {
  font-size: 1.25rem;
  color: #5e5d59;
  margin-bottom: 5px;
}

.post-archive__tagline {
  font-size: 1.1rem;
  font-style: italic;
  color: #d97757;
  font-weight: 500;
}

.post-archive__list {
  display: flex;
  flex-direction: column;
  gap: 60px;
}

.post-archive__item {
  background: #fff;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
  transition: transform 0.3s ease;
}

.post-archive__item:hover {
  transform: translateY(-5px);
}

.post-archive__meta {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #d97757;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 15px;
}

.post-archive__item-title {
  font-size: 1.75rem;
  margin-bottom: 15px;
  line-height: 1.3;
}

.post-archive__item-title a {
  color: #010101;
  text-decoration: none;
}

.post-archive__item-title a:hover {
  color: #d97757;
}

.post-archive__excerpt {
  color: #5e5d59;
  line-height: 1.6;
  margin-bottom: 20px;
  font-size: 1.1rem;
}

.post-archive__read-more {
  font-weight: 600;
  color: #010101;
  text-decoration: none;
  font-size: 0.9rem;
  text-transform: uppercase;
}

.post-archive__read-more:hover {
  color: #d97757;
}

.container--narrow {
  max-width: 800px;
  margin: 0 auto;
}
</style>
