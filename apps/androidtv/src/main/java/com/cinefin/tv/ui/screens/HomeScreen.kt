package com.cinefin.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.cinefin.tv.core.CatalogItem
import com.cinefin.tv.core.HomeModel
import com.cinefin.tv.core.formatRuntime
import com.cinefin.tv.core.ticksToSeconds
import com.cinefin.tv.data.homeFixture
import com.cinefin.tv.data.longMeridian
import com.cinefin.tv.ui.components.CinefinLogo
import com.cinefin.tv.ui.components.CinefinScreen
import com.cinefin.tv.ui.components.FocusBox
import com.cinefin.tv.ui.theme.CinefinColors
import com.cinefin.tv.ui.theme.CinefinTheme
import com.cinefin.tv.ui.theme.LocalSafe

@Composable
fun HomeScreen(
    home: HomeModel,
    hero: CatalogItem?,
    onHero: (CatalogItem) -> Unit,
    onOpen: (CatalogItem) -> Unit,
    onSettings: () -> Unit,
    imageUrl: (CatalogItem, Boolean) -> String?,
) {
    val safe = LocalSafe.current
    val h = hero ?: home.resume.firstOrNull() ?: home.libraries.firstOrNull()?.items?.firstOrNull()
    CinefinScreen(Modifier.fillMaxSize(), fill = true) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(start = safe.x, end = safe.x, top = safe.y),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CinefinLogo(50.dp)
            FocusBox(onClick = onSettings, shape = RoundedCornerShape(8.dp), scaleOnFocus = false) {
                Text("Settings", color = CinefinColors.Text, fontSize = 22.sp, modifier = Modifier.padding(12.dp))
            }
        }
        Column(Modifier.fillMaxSize().padding(top = 140.dp)) {
            if (h != null) {
                Column(Modifier.padding(horizontal = safe.x)) {
                    Text(
                        when {
                            h.type.equals("Episode", true) -> "Continue watching · S${h.parentIndexNumber ?: 1} E${h.indexNumber ?: 1}"
                            h.type.equals("Movie", true) -> "Movie"
                            else -> h.type
                        }.uppercase(),
                        color = CinefinColors.Muted,
                        fontSize = 18.sp,
                        letterSpacing = 2.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(h.name, color = CinefinColors.Text, fontSize = 64.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(10.dp))
                    Text(
                        listOfNotNull(
                            h.year?.toString(),
                            h.runtimeTicks?.let { formatRuntime(ticksToSeconds(it)) },
                            h.officialRating,
                            h.genres.firstOrNull(),
                        ).joinToString(" · "),
                        color = CinefinColors.Muted,
                        fontSize = 24.sp,
                    )
                    h.overview?.let {
                        Spacer(Modifier.height(12.dp))
                        Text(it, color = Color(0xFFC8C8CC), fontSize = 24.sp, modifier = Modifier.width(760.dp), maxLines = 3)
                    }
                }
            } else {
                Column(Modifier.padding(horizontal = safe.x)) {
                    Text("Your library is empty", color = CinefinColors.Text, fontSize = 56.sp, fontWeight = FontWeight.SemiBold)
                    Text("Add a library on the server, then come back.", color = CinefinColors.Muted, fontSize = 24.sp)
                }
            }
            LazyColumn(
                Modifier.fillMaxSize().padding(top = 18.dp),
                contentPadding = PaddingValues(bottom = safe.y),
            ) {
                if (home.resume.isNotEmpty()) {
                    item {
                        PosterRow("Continue watching", home.resume, false, onHero, onOpen, imageUrl, firstFocus = true)
                    }
                }
                if (home.nextUp.isNotEmpty()) {
                    item { PosterRow("Next up", home.nextUp, false, onHero, onOpen, imageUrl) }
                }
                home.libraries.forEach { lib ->
                    item {
                        PosterRow("${lib.name}   ${lib.items.size} titles", lib.items, true, onHero, onOpen, imageUrl)
                    }
                }
            }
        }
    }
}

@Composable
private fun PosterRow(
    title: String,
    items: List<CatalogItem>,
    portrait: Boolean,
    onHero: (CatalogItem) -> Unit,
    onOpen: (CatalogItem) -> Unit,
    imageUrl: (CatalogItem, Boolean) -> String?,
    firstFocus: Boolean = false,
) {
    val safe = LocalSafe.current
    Column(Modifier.padding(start = safe.x, bottom = 12.dp)) {
        Text(title, color = CinefinColors.Text, fontSize = 28.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(if (portrait) 32.dp else 18.dp)) {
            itemsIndexed(items) { index, item ->
                PosterCard(
                    item = item,
                    portrait = portrait,
                    requestFocus = firstFocus && index == 0,
                    image = imageUrl(item, portrait),
                    onSelect = {
                        onHero(item)
                        onOpen(item)
                    },
                )
            }
        }
    }
}

@Composable
private fun PosterCard(
    item: CatalogItem,
    portrait: Boolean,
    requestFocus: Boolean,
    image: String?,
    onSelect: () -> Unit,
) {
    val w = if (portrait) 184.dp else 240.dp
    val h = if (portrait) 276.dp else 136.dp
    Column(Modifier.width(w)) {
        FocusBox(
            onClick = onSelect,
            requestFocus = requestFocus,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.size(w, h),
        ) {
            Box(
                Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(16.dp))
                    .background(tint(item.name)),
            ) {
                if (!image.isNullOrBlank()) {
                    AsyncImage(image, contentDescription = item.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                }
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(Brush.verticalGradient(listOf(Color.Transparent, Color(0xC0000000)))),
                )
                if (!portrait) {
                    Text(
                        item.name,
                        color = CinefinColors.Text,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.align(Alignment.BottomStart).padding(16.dp),
                    )
                }
                val progress = item.userData.positionTicks?.let { pos ->
                    item.runtimeTicks?.let { dur -> if (dur > 0) pos.toFloat() / dur else 0f }
                } ?: 0f
                if (progress > 0f && progress < 0.95f) {
                    Box(
                        Modifier
                            .align(Alignment.BottomCenter)
                            .padding(12.dp)
                            .fillMaxWidth()
                            .height(3.dp)
                            .background(Color(0xFF3A3A3E), RoundedCornerShape(2.dp)),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth(progress)
                                .height(3.dp)
                                .background(Color.White, RoundedCornerShape(2.dp)),
                        )
                    }
                }
            }
        }
        if (portrait) {
            Text(item.name, color = CinefinColors.Muted, fontSize = 18.sp, maxLines = 2, modifier = Modifier.padding(top = 8.dp))
        }
    }
}

private fun tint(name: String): Color {
    val hues = listOf(20f, 28f, 210f, 230f, 160f, 340f, 40f, 200f)
    val h = name.sumOf { it.code } % hues.size
    return Color.hsl(hues[h], 0.18f, 0.28f)
}

@Preview(device = "id:tv_1080p", name = "Home")
@Composable
fun HomePreview() {
    CinefinTheme {
        HomeScreen(homeFixture, longMeridian, {}, {}, {}, { _, _ -> null })
    }
}
